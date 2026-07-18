import { MongoClient, Db } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.MONGODB_DB_NAME);

  console.log(`✅ MongoDB connected → ${env.MONGODB_DB_NAME}`);
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}

export async function ensureIndexes(): Promise<void> {
  const database = getDb();

  await database.collection("users").createIndexes([
    { key: { email: 1 }, unique: true, name: "email_unique" },
    {
      key: { googleId: 1 },
      unique: true,
      sparse: true,
      name: "googleId_unique_sparse",
    },
    { key: { role: 1 }, name: "role_idx" },
    { key: { skills: 1 }, name: "skills_idx" },
    { key: { "company.name": 1 }, name: "company_name_idx" },
  ]);

  await database.collection("jobs").createIndexes([
    { key: { employerId: 1, status: 1 }, name: "employer_status_idx" },
    { key: { status: 1, createdAt: -1 }, name: "status_createdAt_idx" },
    { key: { category: 1, type: 1, location: 1 }, name: "filter_compound_idx" },
    { key: { skills: 1 }, name: "skills_multikey_idx" },
    {
      key: { title: "text", description: "text", shortDescription: "text" },
      name: "job_text_search",
    },
  ]);

  await database.collection("applications").createIndexes([
    { key: { jobId: 1, seekerId: 1 }, unique: true, name: "job_seeker_unique" },
    { key: { seekerId: 1, createdAt: -1 }, name: "seeker_history_idx" },
    { key: { employerId: 1, status: 1 }, name: "employer_status_idx" },
    { key: { jobId: 1, status: 1 }, name: "job_status_idx" },
  ]);

  await database.collection("saved_jobs").createIndexes([
    { key: { seekerId: 1, jobId: 1 }, unique: true, name: "seeker_job_unique" },
    { key: { seekerId: 1, createdAt: -1 }, name: "seeker_saved_idx" },
  ]);

  await database.collection("interactions").createIndexes([
    {
      key: { seekerId: 1, type: 1, createdAt: -1 },
      name: "seeker_interaction_idx",
    },
    { key: { jobId: 1 }, name: "job_interaction_idx" },
  ]);

  await database
    .collection("conversations")
    .createIndexes([
      { key: { userId: 1, updatedAt: -1 }, name: "user_conversations_idx" },
    ]);

  await database.collection("recommendations_cache").createIndexes([
    { key: { seekerId: 1 }, unique: true, name: "seeker_cache_unique" },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "cache_ttl_idx" },
  ]);

  console.log("✅ Indexes ensured for all collections");
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
