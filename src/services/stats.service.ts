import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { Job, Application, User } from "../types/models";

interface GroupCount {
  _id: string;
  count: number;
}

export async function getPublicStats() {
  const db = getDb();
  const [activeJobs, employerIds, totalApplications] = await Promise.all([
    db.collection("jobs").countDocuments({ status: "active" }),
    db.collection("jobs").distinct("employerId", { status: "active" }),
    db.collection("applications").countDocuments({}),
  ]);

  return { activeJobs, companies: employerIds.length, totalApplications };
}

export async function getEmployerDashboard(employerId: string) {
  const db = getDb();
  const employerObjectId = new ObjectId(employerId);

  const jobsCollection = db.collection<Job>("jobs");
  const applicationsCollection = db.collection<Application>("applications");
  const usersCollection = db.collection<User>("users");

  const [
    totalJobs,
    activeJobs,
    totalApplicants,
    statusBreakdown,
    jobsOverTime,
    applicationsOverTime,
    recentApplications,
  ] = await Promise.all([
    jobsCollection.countDocuments({ employerId: employerObjectId }),
    jobsCollection.countDocuments({
      employerId: employerObjectId,
      status: "active",
    }),
    applicationsCollection.countDocuments({ employerId: employerObjectId }),
    applicationsCollection
      .aggregate<GroupCount>([
        { $match: { employerId: employerObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    jobsCollection
      .aggregate<GroupCount>([
        { $match: { employerId: employerObjectId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    applicationsCollection
      .aggregate<GroupCount>([
        { $match: { employerId: employerObjectId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    applicationsCollection
      .find({ employerId: employerObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  const jobIds = recentApplications.map((a) => a.jobId);
  const seekerIds = recentApplications.map((a) => a.seekerId);
  const [jobs, seekers] = await Promise.all([
    jobsCollection.find({ _id: { $in: jobIds } }).toArray(),
    usersCollection.find({ _id: { $in: seekerIds } }).toArray(),
  ]);
  const jobMap = new Map(jobs.map((j) => [j._id!.toString(), j]));
  const seekerMap = new Map(seekers.map((s) => [s._id!.toString(), s]));

  return {
    totalJobs,
    activeJobs,
    totalApplicants,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s._id,
      count: s.count,
    })),
    jobsOverTime: jobsOverTime.map((j) => ({ date: j._id, count: j.count })),
    applicationsOverTime: applicationsOverTime.map((a) => ({
      date: a._id,
      count: a.count,
    })),
    recentApplications: recentApplications.map((a) => ({
      _id: a._id,
      status: a.status,
      createdAt: a.createdAt,
      job: jobMap.get(a.jobId.toString()) ?? null,
      seekerName: seekerMap.get(a.seekerId.toString())?.name ?? "Unknown",
    })),
  };
}
