import { ObjectId, WithId } from "mongodb";
import { getDb } from "../config/db";
import { Job, SavedJob } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { logInteraction } from "./interaction.service";

function savedJobsCollection() {
  return getDb().collection<SavedJob>("saved_jobs");
}
function jobsCollection() {
  return getDb().collection<Job>("jobs");
}

export async function saveJob(seekerId: string, jobId: string) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const jobObjectId = new ObjectId(jobId);

  const job = await jobsCollection().findOne({ _id: jobObjectId });
  if (!job) throw new ApiError(404, "Job not found");

  const existing = await savedJobsCollection().findOne({
    seekerId: new ObjectId(seekerId),
    jobId: jobObjectId,
  });
  if (existing) return existing;

  const saved: SavedJob = {
    seekerId: new ObjectId(seekerId),
    jobId: jobObjectId,
    createdAt: new Date(),
  };
  const result = await savedJobsCollection().insertOne(saved);
  saved._id = result.insertedId;

  await logInteraction(seekerId, jobObjectId, "save");
  return saved;
}

export async function unsaveJob(seekerId: string, jobId: string) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const jobObjectId = new ObjectId(jobId);

  await savedJobsCollection().deleteOne({
    seekerId: new ObjectId(seekerId),
    jobId: jobObjectId,
  });
  await logInteraction(seekerId, jobObjectId, "unsave");
}

export async function isJobSaved(seekerId: string, jobId: string) {
  if (!ObjectId.isValid(jobId)) return false;
  const existing = await savedJobsCollection().findOne({
    seekerId: new ObjectId(seekerId),
    jobId: new ObjectId(jobId),
  });
  return !!existing;
}

export async function getSavedJobs(
  seekerId: string,
  page: number,
  limit: number,
) {
  const collection = savedJobsCollection();
  const filter = { seekerId: new ObjectId(seekerId) };

  const [savedEntries, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  const jobIds = savedEntries.map((s) => s.jobId);
  const jobs = await jobsCollection()
    .find({ _id: { $in: jobIds } })
    .toArray();
  const jobMap = new Map(jobs.map((j) => [j._id!.toString(), j]));
  const orderedJobs = savedEntries
    .map((s) => jobMap.get(s.jobId.toString()))
    .filter((j): j is WithId<Job> => !!j);

  return {
    jobs: orderedJobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
