import { ObjectId, WithId } from "mongodb";
import { getDb } from "../config/db";
import { User, Application, Job, Interaction } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { UpdateProfileInput } from "../validators/profile.schema";

function usersCollection() {
  return getDb().collection<User>("users");
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await usersCollection().updateOne(
    { _id: new ObjectId(userId) },
    { $set: { ...input, updatedAt: new Date() } },
  );
  const user = await usersCollection().findOne({ _id: new ObjectId(userId) });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

export async function getSeekerDashboard(seekerId: string) {
  const db = getDb();
  const seekerObjectId = new ObjectId(seekerId);

  const [savedJobsCount, applicationsCount, recentApplications, recentViews] =
    await Promise.all([
      db
        .collection<{ seekerId: ObjectId }>("saved_jobs")
        .countDocuments({ seekerId: seekerObjectId }),
      db
        .collection<Application>("applications")
        .countDocuments({ seekerId: seekerObjectId }),
      db
        .collection<Application>("applications")
        .find({ seekerId: seekerObjectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      db
        .collection<Interaction>("interactions")
        .find({ seekerId: seekerObjectId, type: "view" })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
    ]);

  const appJobIds = recentApplications.map((a) => a.jobId);
  const uniqueViewedJobIds = Array.from(
    new Set(recentViews.map((v) => v.jobId.toString())),
  )
    .slice(0, 5)
    .map((id) => new ObjectId(id));

  const jobs = await db
    .collection<Job>("jobs")
    .find({ _id: { $in: [...appJobIds, ...uniqueViewedJobIds] } })
    .toArray();
  const jobMap = new Map(jobs.map((j) => [j._id!.toString(), j]));

  return {
    savedJobsCount,
    applicationsCount,
    recentApplications: recentApplications.map((a) => ({
      ...a,
      job: jobMap.get(a.jobId.toString()) ?? null,
    })),
    recentlyViewedJobs: uniqueViewedJobIds
      .map((id) => jobMap.get(id.toString()))
      .filter((j): j is WithId<Job> => !!j),
  };
}
