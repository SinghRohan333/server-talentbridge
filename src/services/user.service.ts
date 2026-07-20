import { ObjectId, WithId } from "mongodb";
import { getDb } from "../config/db";
import { User, Application, Job, Interaction } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { UpdateProfileInput } from "../validators/profile.schema";
import cloudinary, { assertCloudinaryConfigured } from "../config/cloudinary";
import { extractResumeText } from "./ai/resumeParser.service";
import { extractResumeData } from "./ai/resumeExtraction.service";

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

interface CloudinaryRawUploadResult {
  secure_url: string;
}

export async function processResumeUpload(
  userId: string,
  file: Express.Multer.File,
) {
  assertCloudinaryConfigured();
  const resumeText = await extractResumeText(file.buffer, file.mimetype);
  const extracted = await extractResumeData(resumeText);

  const extension = file.mimetype === "application/pdf" ? "pdf" : "docx";
  const uploadResult = await new Promise<CloudinaryRawUploadResult>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            folder: "talentbridge/resumes",
            public_id: `resume-${userId}-${Date.now()}`,
            format: extension,
          },
          (error, result) => {
            if (error || !result)
              return reject(error ?? new Error("Resume upload failed"));
            resolve(result as CloudinaryRawUploadResult);
          },
        )
        .end(file.buffer);
    },
  );

  const user = await usersCollection().findOne({ _id: new ObjectId(userId) });
  if (!user) throw new ApiError(404, "User not found");

  const mergedSkills = Array.from(
    new Set([...user.skills, ...extracted.skills]),
  );

  const update: Partial<User> = {
    resumeUrl: uploadResult.secure_url,
    resumeSummary: extracted.summary || user.resumeSummary,
    skills: mergedSkills,
    updatedAt: new Date(),
  };
  if (extracted.experience.length > 0) update.experience = extracted.experience;
  if (extracted.education.length > 0) update.education = extracted.education;

  await usersCollection().updateOne({ _id: user._id }, { $set: update });
  return usersCollection().findOne({ _id: user._id });
}
