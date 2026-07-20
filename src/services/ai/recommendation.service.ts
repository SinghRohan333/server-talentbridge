import { ObjectId, WithId } from "mongodb";
import crypto from "crypto";
import { getDb } from "../../config/db";
import {
  User,
  Job,
  Application,
  Interaction,
  RecommendationCache,
  RecommendationEntry,
} from "../../types/models";
import { ApiError } from "../../middleware/errorHandler";
import { callGroqForJson } from "./groqClient";

function usersCollection() {
  return getDb().collection<User>("users");
}
function jobsCollection() {
  return getDb().collection<Job>("jobs");
}
function cacheCollection() {
  return getDb().collection<RecommendationCache>("recommendations_cache");
}

interface InteractionSignal {
  appliedJobIds: ObjectId[];
  recentViewedJobIds: ObjectId[];
  recentViewedCategories: string[];
  savedCategories: string[];
  hasAnyInteraction: boolean;
}

async function getInteractionSignal(
  seekerId: string,
): Promise<InteractionSignal> {
  const db = getDb();
  const seekerObjectId = new ObjectId(seekerId);

  const [applications, recentViews, savedJobs] = await Promise.all([
    db
      .collection<Application>("applications")
      .find({ seekerId: seekerObjectId })
      .project({ jobId: 1 })
      .toArray(),
    db
      .collection<Interaction>("interactions")
      .find({ seekerId: seekerObjectId, type: "view" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection<{ jobId: ObjectId }>("saved_jobs")
      .find({ seekerId: seekerObjectId })
      .toArray(),
  ]);

  const appliedJobIds = applications.map((a) => a.jobId);
  const recentViewedJobIds = Array.from(
    new Set(recentViews.map((v) => v.jobId.toString())),
  ).map((id) => new ObjectId(id));

  const [viewedJobs, savedJobDocs] = await Promise.all([
    jobsCollection()
      .find({ _id: { $in: recentViewedJobIds } })
      .project({ category: 1 })
      .toArray(),
    jobsCollection()
      .find({ _id: { $in: savedJobs.map((s) => s.jobId) } })
      .project({ category: 1 })
      .toArray(),
  ]);

  return {
    appliedJobIds,
    recentViewedJobIds,
    recentViewedCategories: Array.from(
      new Set(viewedJobs.map((j) => j.category)),
    ),
    savedCategories: Array.from(new Set(savedJobDocs.map((j) => j.category))),
    hasAnyInteraction:
      recentViews.length > 0 || savedJobs.length > 0 || applications.length > 0,
  };
}

function computeProfileHash(seeker: User, signal: InteractionSignal): string {
  const payload = JSON.stringify({
    skills: [...seeker.skills].sort(),
    preferredJobTypes: [...seeker.preferredJobTypes].sort(),
    preferredLocations: [...seeker.preferredLocations].sort(),
    preferredCategories: [...seeker.preferredCategories].sort(),
    resumeSummary: seeker.resumeSummary,
    appliedJobIds: signal.appliedJobIds.map((id) => id.toString()).sort(),
    recentViewedJobIds: signal.recentViewedJobIds
      .map((id) => id.toString())
      .sort(),
    savedCategories: [...signal.savedCategories].sort(),
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function getCandidateJobs(
  seeker: User,
  appliedJobIds: ObjectId[],
): Promise<Job[]> {
  return jobsCollection()
    .aggregate<Job>([
      { $match: { status: "active", _id: { $nin: appliedJobIds } } },
      {
        $addFields: {
          skillOverlap: {
            $size: {
              $setIntersection: [{ $ifNull: ["$skills", []] }, seeker.skills],
            },
          },
          categoryMatch: {
            $cond: [{ $in: ["$category", seeker.preferredCategories] }, 2, 0],
          },
          typeMatch: {
            $cond: [{ $in: ["$type", seeker.preferredJobTypes] }, 1, 0],
          },
          locationMatch: {
            $cond: [{ $in: ["$location", seeker.preferredLocations] }, 1, 0],
          },
        },
      },
      {
        $addFields: {
          heuristicScore: {
            $add: [
              "$skillOverlap",
              "$categoryMatch",
              "$typeMatch",
              "$locationMatch",
            ],
          },
        },
      },
      { $sort: { heuristicScore: -1, createdAt: -1 } },
      { $limit: 25 },
    ])
    .toArray();
}

async function rankCandidatesWithAI(
  seeker: User,
  candidates: Job[],
  signal: InteractionSignal,
): Promise<RecommendationEntry[]> {
  const candidateSummaries = candidates.map((job) => ({
    id: job._id!.toString(),
    title: job.title,
    category: job.category,
    type: job.type,
    locationType: job.locationType,
    location: job.location,
    skills: job.skills,
    salary:
      job.salaryMin && job.salaryMax
        ? `${job.salaryMin}-${job.salaryMax}`
        : "not disclosed",
  }));

  const systemPrompt = `You are a job recommendation engine. Given a job seeker's profile and a list of
candidate jobs, select and rank the best-matching jobs for them.
Respond with ONLY a JSON object (no markdown, no commentary) matching exactly this shape:
{ "recommendations": [ { "jobId": string, "score": number, "reasoning": string } ] }
Rules:
- Return at most 10 recommendations, ordered best-first.
- "jobId" MUST be copied exactly from the candidate list "id" field — never invent an id.
- "score" is 0-100 reflecting match quality.
- "reasoning" is one short, specific sentence explaining the match (mention a real skill/category overlap).
- Only include jobs from the candidate list.`;

  const userPrompt = JSON.stringify({
    seekerProfile: {
      skills: seeker.skills,
      preferredJobTypes: seeker.preferredJobTypes,
      preferredLocations: seeker.preferredLocations,
      preferredCategories: seeker.preferredCategories,
      resumeSummary: seeker.resumeSummary,
    },
    recentlyViewedCategories: signal.recentViewedCategories,
    savedJobCategories: signal.savedCategories,
    candidateJobs: candidateSummaries,
  });

  const result = await callGroqForJson<{
    recommendations: { jobId: string; score: number; reasoning: string }[];
  }>({
    systemPrompt,
    userPrompt,
  });

  const candidateIds = new Set(candidates.map((c) => c._id!.toString()));
  const valid = result.recommendations
    .filter((r) => candidateIds.has(r.jobId))
    .slice(0, 10);

  if (valid.length === 0) {
    return candidates.slice(0, 10).map((job) => ({
      jobId: job._id!,
      score: 55,
      reasoning: "Matches your profile based on skills and preferences.",
    }));
  }

  return valid.map((r) => ({
    jobId: new ObjectId(r.jobId),
    score: r.score,
    reasoning: r.reasoning,
  }));
}

async function getCachedRecommendations(seekerId: string, profileHash: string) {
  return cacheCollection().findOne({
    seekerId: new ObjectId(seekerId),
    profileHash,
    expiresAt: { $gt: new Date() },
  });
}

async function saveRecommendationCache(
  seekerId: string,
  recommendations: RecommendationEntry[],
  profileHash: string,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await cacheCollection().updateOne(
    { seekerId: new ObjectId(seekerId) },
    { $set: { recommendations, profileHash, generatedAt: now, expiresAt } },
    { upsert: true },
  );
}

async function hydrateRecommendations(entries: RecommendationEntry[]) {
  const jobIds = entries.map((e) => e.jobId);
  const jobs = await jobsCollection()
    .find({ _id: { $in: jobIds } })
    .toArray();
  const jobMap = new Map(jobs.map((j) => [j._id!.toString(), j]));

  return entries
    .map((entry) => {
      const job = jobMap.get(entry.jobId.toString());
      return job
        ? { job, score: entry.score, reasoning: entry.reasoning }
        : null;
    })
    .filter(
      (r): r is { job: WithId<Job>; score: number; reasoning: string } =>
        r !== null,
    );
}

export async function generateRecommendations(
  seekerId: string,
  forceRefresh = false,
) {
  const seeker = await usersCollection().findOne({
    _id: new ObjectId(seekerId),
  });
  if (!seeker) throw new ApiError(404, "User not found");

  const signal = await getInteractionSignal(seekerId);
  const profileHash = computeProfileHash(seeker, signal);

  if (!forceRefresh) {
    const cached = await getCachedRecommendations(seekerId, profileHash);
    if (cached)
      return {
        recommendations: await hydrateRecommendations(cached.recommendations),
        cached: true,
      };
  }

  const candidates = await getCandidateJobs(seeker, signal.appliedJobIds);
  const hasSignal = seeker.skills.length > 0 || signal.hasAnyInteraction;

  let recommendations: RecommendationEntry[];
  if (!hasSignal || candidates.length === 0) {
    recommendations = candidates.slice(0, 10).map((job) => ({
      jobId: job._id!,
      score: 60,
      reasoning:
        "A recent opening to help you get started — recommendations personalize as you browse and apply.",
    }));
  } else {
    recommendations = await rankCandidatesWithAI(seeker, candidates, signal);
  }

  await saveRecommendationCache(seekerId, recommendations, profileHash);
  return {
    recommendations: await hydrateRecommendations(recommendations),
    cached: false,
  };
}
