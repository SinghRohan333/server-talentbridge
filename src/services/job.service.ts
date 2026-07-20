import { ObjectId, Filter, Sort } from "mongodb";
import { getDb } from "../config/db";
import { Job, User } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import {
  CreateJobInput,
  UpdateJobInput,
  JobQueryInput,
} from "../validators/job.schema";
import { logInteraction } from "./interaction.service";

function jobsCollection() {
  return getDb().collection<Job>("jobs");
}
function usersCollection() {
  return getDb().collection<User>("users");
}

export async function createJob(employerId: string, input: CreateJobInput) {
  const employer = await usersCollection().findOne({
    _id: new ObjectId(employerId),
  });
  if (!employer) throw new ApiError(404, "Employer account not found");

  const logo = input.companyLogoUrl ?? employer.company?.logo ?? null;

  if (input.companyLogoUrl && input.companyLogoUrl !== employer.company?.logo) {
    await usersCollection().updateOne(
      { _id: employer._id },
      {
        $set: {
          "company.logo": input.companyLogoUrl,
          "company.name": employer.company?.name || employer.name,
          updatedAt: new Date(),
        },
      },
    );
  }

  const now = new Date();
  const job: Job = {
    employerId: new ObjectId(employerId),
    title: input.title,
    description: input.description,
    shortDescription: input.shortDescription,
    company: { name: employer.company?.name || employer.name, logo },
    category: input.category,
    type: input.type,
    locationType: input.locationType,
    location: input.location,
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    salaryCurrency: input.salaryCurrency ?? "USD",
    skills: input.skills,
    requirements: input.requirements,
    benefits: input.benefits ?? [],
    experienceLevel: input.experienceLevel,
    applicationDeadline: input.applicationDeadline
      ? new Date(input.applicationDeadline)
      : null,
    status: "active",
    viewCount: 0,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await jobsCollection().insertOne(job);
  job._id = result.insertedId;
  return job;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildJobFilter(
  query: JobQueryInput,
  opts: { restrictActive: boolean; employerId?: string },
) {
  const filter: Filter<Job> = {};

  if (opts.employerId) filter.employerId = new ObjectId(opts.employerId);

  if (opts.restrictActive) {
    filter.status = "active";
  } else if (query.status) {
    filter.status = query.status;
  }

  if (query.category) filter.category = query.category;
  if (query.type) filter.type = query.type;
  if (query.locationType) filter.locationType = query.locationType;
  if (query.location)
    filter.location = { $regex: escapeRegex(query.location), $options: "i" };
  if (query.minSalary !== undefined)
    filter.salaryMax = { $gte: query.minSalary };
  if (query.maxSalary !== undefined)
    filter.salaryMin = { $lte: query.maxSalary };

  if (query.search) {
    const pattern = escapeRegex(query.search);
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { shortDescription: { $regex: pattern, $options: "i" } },
      { "company.name": { $regex: pattern, $options: "i" } },
      { category: { $regex: pattern, $options: "i" } },
      { skills: { $regex: pattern, $options: "i" } },
    ];
  }

  return filter;
}

function buildSort(sortParam?: string): Sort {
  switch (sortParam) {
    case "salary_high":
      return { salaryMax: -1 };
    case "salary_low":
      return { salaryMin: 1 };
    case "oldest":
      return { createdAt: 1 };
    default:
      return { createdAt: -1 };
  }
}

export async function getJobs(
  query: JobQueryInput,
  opts: { restrictActive: boolean; employerId?: string },
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;
  const filter = buildJobFilter(query, opts);
  const sort = buildSort(query.sort);

  const collection = jobsCollection();
  const [jobs, total] = await Promise.all([
    collection
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getJobById(
  jobId: string,
  requester?: { id: string; role: string },
) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const job = await jobsCollection().findOne({ _id: new ObjectId(jobId) });
  if (!job) throw new ApiError(404, "Job not found");

  const isOwner = !!requester && job.employerId.toString() === requester.id;
  const isAdmin = requester?.role === "admin";

  if (job.status !== "active" && !isOwner && !isAdmin) {
    throw new ApiError(404, "Job not found");
  }

  if (job.status === "active" && !isOwner) {
    await jobsCollection().updateOne(
      { _id: job._id },
      { $inc: { viewCount: 1 } },
    );
    job.viewCount += 1;

    if (requester?.role === "seeker") {
      await logInteraction(requester.id, job._id!, "view");
    }
  }

  return job;
}

export async function getSimilarJobs(job: Job, limitCount = 4) {
  return jobsCollection()
    .find({
      _id: { $ne: job._id },
      status: "active",
      $or: [{ category: job.category }, { skills: { $in: job.skills } }],
    })
    .limit(limitCount)
    .toArray();
}

export async function updateJob(
  jobId: string,
  requester: { id: string; role: string },
  input: UpdateJobInput,
) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const job = await jobsCollection().findOne({ _id: new ObjectId(jobId) });
  if (!job) throw new ApiError(404, "Job not found");

  const isOwner = job.employerId.toString() === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw new ApiError(403, "You do not have permission to modify this job");
  }

  const { applicationDeadline, ...rest } = input;
  const update: Partial<Job> = { ...rest, updatedAt: new Date() };
  if (applicationDeadline !== undefined) {
    update.applicationDeadline = applicationDeadline
      ? new Date(applicationDeadline)
      : null;
  }

  await jobsCollection().updateOne({ _id: job._id }, { $set: update });
  return jobsCollection().findOne({ _id: job._id });
}

export async function deleteJob(
  jobId: string,
  requester: { id: string; role: string },
) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const job = await jobsCollection().findOne({ _id: new ObjectId(jobId) });
  if (!job) throw new ApiError(404, "Job not found");

  const isOwner = job.employerId.toString() === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw new ApiError(403, "You do not have permission to delete this job");
  }

  await jobsCollection().deleteOne({ _id: job._id });
}

export async function getJobFilterOptions() {
  const collection = jobsCollection();
  const [categories, locations] = await Promise.all([
    collection.distinct("category", { status: "active" }),
    collection.distinct("location", { status: "active" }),
  ]);
  return { categories: categories.sort(), locations: locations.sort() };
}

export async function getCategoryCounts() {
  return jobsCollection()
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: "active" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ])
    .toArray();
}
