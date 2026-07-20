import { ObjectId, Filter } from "mongodb";
import { getDb } from "../config/db";
import { User, Job } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { escapeRegex } from "./job.service";
import {
  AdminUserQueryInput,
  AdminJobQueryInput,
} from "../validators/admin.schema";

function usersCollection() {
  return getDb().collection<User>("users");
}
function jobsCollection() {
  return getDb().collection<Job>("jobs");
}

export async function getAdminStats() {
  const db = getDb();

  const [
    usersByRole,
    totalJobs,
    activeJobs,
    flaggedJobs,
    totalApplications,
    userGrowth,
    jobsOverTime,
  ] = await Promise.all([
    usersCollection()
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ])
      .toArray(),
    jobsCollection().countDocuments({}),
    jobsCollection().countDocuments({ status: "active" }),
    jobsCollection().countDocuments({ status: "flagged" }),
    db.collection("applications").countDocuments({}),
    usersCollection()
      .aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    jobsCollection()
      .aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const roleMap = new Map(usersByRole.map((r) => [r._id, r.count]));

  return {
    totalUsers: usersByRole.reduce((sum, r) => sum + r.count, 0),
    totalSeekers: roleMap.get("seeker") ?? 0,
    totalEmployers: roleMap.get("employer") ?? 0,
    totalAdmins: roleMap.get("admin") ?? 0,
    totalJobs,
    activeJobs,
    flaggedJobs,
    totalApplications,
    userGrowth: userGrowth.map((u) => ({ date: u._id, count: u.count })),
    jobsOverTime: jobsOverTime.map((j) => ({ date: j._id, count: j.count })),
  };
}

export async function listUsers(query: AdminUserQueryInput) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const filter: Filter<User> = {};

  if (query.role) filter.role = query.role;
  if (query.search) {
    const pattern = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
    ];
  }

  const collection = usersCollection();
  const [users, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    users: users.map(({ passwordHash, refreshTokenVersion, ...safe }) => safe),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function updateUserStatus(
  adminId: string,
  targetUserId: string,
  isActive: boolean,
) {
  if (!ObjectId.isValid(targetUserId))
    throw new ApiError(400, "Invalid user id");
  if (targetUserId === adminId)
    throw new ApiError(400, "You cannot change your own account status");

  const collection = usersCollection();
  const target = await collection.findOne({ _id: new ObjectId(targetUserId) });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin")
    throw new ApiError(403, "Cannot change status of an admin account");

  // Bumping refreshTokenVersion on deactivation forces logout on their next refresh
  // attempt (within ~15 min, when their current access token expires) rather than
  // requiring a DB check on every single request.
  const updateOps = isActive
    ? { $set: { isActive, updatedAt: new Date() } }
    : {
        $set: { isActive, updatedAt: new Date() },
        $inc: { refreshTokenVersion: 1 },
      };

  await collection.updateOne({ _id: target._id }, updateOps);
  return collection.findOne({ _id: target._id });
}

export async function deleteUserAdmin(adminId: string, targetUserId: string) {
  if (!ObjectId.isValid(targetUserId))
    throw new ApiError(400, "Invalid user id");
  if (targetUserId === adminId)
    throw new ApiError(400, "You cannot delete your own account");

  const collection = usersCollection();
  const target = await collection.findOne({ _id: new ObjectId(targetUserId) });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin")
    throw new ApiError(403, "Cannot delete an admin account");

  await collection.deleteOne({ _id: target._id });
}

export async function listJobsAdmin(query: AdminJobQueryInput) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const filter: Filter<Job> = {};

  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = escapeRegex(query.search);
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { "company.name": { $regex: pattern, $options: "i" } },
    ];
  }

  const collection = jobsCollection();
  const [jobs, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
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

export async function setJobFlag(jobId: string, flagged: boolean) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const collection = jobsCollection();
  const job = await collection.findOne({ _id: new ObjectId(jobId) });
  if (!job) throw new ApiError(404, "Job not found");

  // Simplification: unflagging always restores "active" rather than whatever status
  // preceded the flag. Fine for this project's scope — flagging targets live listings.
  const newStatus = flagged ? "flagged" : "active";
  await collection.updateOne(
    { _id: job._id },
    { $set: { status: newStatus, updatedAt: new Date() } },
  );
  return collection.findOne({ _id: job._id });
}

export async function deleteJobAdmin(jobId: string) {
  if (!ObjectId.isValid(jobId)) throw new ApiError(400, "Invalid job id");
  const result = await jobsCollection().deleteOne({ _id: new ObjectId(jobId) });
  if (result.deletedCount === 0) throw new ApiError(404, "Job not found");
}
