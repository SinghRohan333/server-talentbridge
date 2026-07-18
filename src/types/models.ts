import { ObjectId } from "mongodb";

export type UserRole = "seeker" | "employer" | "admin";

export interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: number;
}

export interface Company {
  name: string;
  logo: string | null;
  website: string | null;
  description: string | null;
  size: string | null;
  industry: string | null;
}

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string | null;
  googleId?: string;
  role: UserRole;
  name: string;
  avatar: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  // Seeker-only
  skills: string[];
  experience: Experience[];
  education: Education[];
  resumeUrl: string | null;
  resumeSummary: string | null;
  preferredJobTypes: string[];
  preferredLocations: string[];
  preferredCategories: string[];
  // Employer-only
  company: Company | null;
  // Meta
  isActive: boolean;
  refreshTokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type LocationType = "on-site" | "remote" | "hybrid";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";
export type JobStatus = "active" | "closed" | "draft" | "flagged";

export interface Job {
  _id?: ObjectId;
  employerId: ObjectId;
  title: string;
  description: string;
  shortDescription: string;
  company: { name: string; logo: string | null };
  category: string;
  type: JobType;
  locationType: LocationType;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skills: string[];
  requirements: string[];
  benefits: string[];
  experienceLevel: ExperienceLevel;
  applicationDeadline: Date | null;
  status: JobStatus;
  viewCount: number;
  applicationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "accepted";

export interface Application {
  _id?: ObjectId;
  jobId: ObjectId;
  seekerId: ObjectId;
  employerId: ObjectId;
  coverLetter: string | null;
  resumeUrl: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedJob {
  _id?: ObjectId;
  seekerId: ObjectId;
  jobId: ObjectId;
  createdAt: Date;
}

export type InteractionType =
  | "view"
  | "save"
  | "unsave"
  | "apply"
  | "click_similar";

export interface Interaction {
  _id?: ObjectId;
  seekerId: ObjectId;
  jobId: ObjectId;
  type: InteractionType;
  createdAt: Date;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls:
    | { id: string; name: string; args: Record<string, unknown> }[]
    | null;
  toolResults: { callId: string; result: unknown }[] | null;
  timestamp: Date;
}

export interface Conversation {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  messages: ConversationMessage[];
  suggestedFollowUps: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationEntry {
  jobId: ObjectId;
  score: number;
  reasoning: string;
}

export interface RecommendationCache {
  _id?: ObjectId;
  seekerId: ObjectId;
  recommendations: RecommendationEntry[];
  profileHash: string;
  generatedAt: Date;
  expiresAt: Date;
}
