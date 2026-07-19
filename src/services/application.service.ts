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

export async function getApplicationsForJob(
  employerId: string,
  jobId: string,
  page: number,
  limit: number,
) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const jobObjectId = new ObjectId(jobId);

  const job = await jobsCollection().findOne({ _id: jobObjectId });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.employerId.toString() !== employerId) {
    throw new ApiError(
      403,
      "You do not have permission to view these applicants",
    );
  }

  const collection = applicationsCollection();
  const filter = { jobId: jobObjectId };

  const [applications, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  const seekerIds = applications.map((a) => a.seekerId);
  const seekers = await usersCollection()
    .find({ _id: { $in: seekerIds } })
    .toArray();
  const seekerMap = new Map(seekers.map((s) => [s._id!.toString(), s]));

  const withSeekers = applications.map((app) => {
    const seeker = seekerMap.get(app.seekerId.toString());
    return {
      ...app,
      seeker: seeker
        ? {
            _id: seeker._id,
            name: seeker.name,
            email: seeker.email,
            skills: seeker.skills,
            resumeUrl: seeker.resumeUrl,
            avatar: seeker.avatar,
          }
        : null,
    };
  });

  return {
    job,
    applications: withSeekers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function updateApplicationStatus(
  employerId: string,
  applicationId: string,
  status: Application["status"],
) {
  if (!ObjectId.isValid(applicationId))
    throw new ApiError(400, "Invalid application id");
  const application = await applicationsCollection().findOne({
    _id: new ObjectId(applicationId),
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.employerId.toString() !== employerId) {
    throw new ApiError(
      403,
      "You do not have permission to modify this application",
    );
  }

  await applicationsCollection().updateOne(
    { _id: application._id },
    { $set: { status, updatedAt: new Date() } },
  );
  return applicationsCollection().findOne({ _id: application._id });
}
