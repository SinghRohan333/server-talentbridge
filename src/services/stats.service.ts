import { getDb } from "../config/db";

export async function getPublicStats() {
  const db = getDb();
  const [activeJobs, employerIds, totalApplications] = await Promise.all([
    db.collection("jobs").countDocuments({ status: "active" }),
    db.collection("jobs").distinct("employerId", { status: "active" }),
    db.collection("applications").countDocuments({}),
  ]);

  return {
    activeJobs,
    companies: employerIds.length,
    totalApplications,
  };
}
