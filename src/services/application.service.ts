import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { Job, Application, User } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { ApplyToJobInput } from "../validators/application.schema";
import { logInteraction } from "./interaction.service";

function applicationsCollection() {
  return getDb().collection<Application>("applications");
}
function jobsCollection() {
  return getDb().collection<Job>("jobs");
}
function usersCollection() {
  return getDb().collection<User>("users");
}

export async function applyToJob(
  seekerId: string,
  jobId: string,
  input: ApplyToJobInput,
) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const jobObjectId = new ObjectId(jobId);

  const job = await jobsCollection().findOne({ _id: jobObjectId });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.status !== "active")
    throw new ApiError(400, "This job is no longer accepting applications");

  const existing = await applicationsCollection().findOne({
    jobId: jobObjectId,
    seekerId: new ObjectId(seekerId),
  });
  if (existing) throw new ApiError(409, "You have already applied to this job");

  const seeker = await usersCollection().findOne({
    _id: new ObjectId(seekerId),
  });

  const now = new Date();
  const application: Application = {
    jobId: jobObjectId,
    seekerId: new ObjectId(seekerId),
    employerId: job.employerId,
    coverLetter: input.coverLetter ?? null,
    resumeUrl: seeker?.resumeUrl ?? null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const result = await applicationsCollection().insertOne(application);
  application._id = result.insertedId;

  await jobsCollection().updateOne(
    { _id: jobObjectId },
    { $inc: { applicationCount: 1 } },
  );
  await logInteraction(seekerId, jobObjectId, "apply");

  return application;
}

export async function hasAppliedToJob(seekerId: string, jobId: string) {
  if (!ObjectId.isValid(jobId)) return false;
  const existing = await applicationsCollection().findOne({
    seekerId: new ObjectId(seekerId),
    jobId: new ObjectId(jobId),
  });
  return !!existing;
}

export async function getMyApplications(
  seekerId: string,
  page: number,
  limit: number,
) {
  const collection = applicationsCollection();
  const filter = { seekerId: new ObjectId(seekerId) };

  const [applications, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  const jobIds = applications.map((a) => a.jobId);
  const jobs = await jobsCollection()
    .find({ _id: { $in: jobIds } })
    .toArray();
  const jobMap = new Map(jobs.map((j) => [j._id!.toString(), j]));
  const withJobs = applications.map((app) => ({
    ...app,
    job: jobMap.get(app.jobId.toString()) ?? null,
  }));

  return {
    applications: withJobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
