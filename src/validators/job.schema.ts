import { z } from "zod";

const jobTypeEnum = z.enum([
  "full-time",
  "part-time",
  "contract",
  "internship",
]);
const locationTypeEnum = z.enum(["on-site", "remote", "hybrid"]);
const experienceLevelEnum = z.enum(["entry", "mid", "senior", "lead"]);

export const createJobSchema = z
  .object({
    title: z.string().trim().min(5, "Title must be at least 5 characters"),
    shortDescription: z.string().trim().min(10).max(200),
    description: z
      .string()
      .trim()
      .min(50, "Description must be at least 50 characters"),
    category: z.string().trim().min(2),
    type: jobTypeEnum,
    locationType: locationTypeEnum,
    location: z.string().trim().min(2),
    salaryMin: z.coerce.number().nonnegative().optional(),
    salaryMax: z.coerce.number().nonnegative().optional(),
    salaryCurrency: z.string().trim().length(3).optional(),
    skills: z.array(z.string().trim().min(1)).min(1, "Add at least one skill"),
    requirements: z
      .array(z.string().trim().min(1))
      .min(1, "Add at least one requirement"),
    benefits: z.array(z.string().trim().min(1)).optional(),
    experienceLevel: experienceLevelEnum,
    applicationDeadline: z.string().datetime().optional(),
    companyLogoUrl: z.string().trim().url("Enter a valid URL").optional(),
  })
  .refine(
    (data) =>
      !data.salaryMin || !data.salaryMax || data.salaryMax >= data.salaryMin,
    {
      message: "Maximum salary must be greater than or equal to minimum salary",
      path: ["salaryMax"],
    },
  );

export const updateJobSchema = z.object({
  title: z.string().trim().min(5).optional(),
  shortDescription: z.string().trim().min(10).max(200).optional(),
  description: z.string().trim().min(50).optional(),
  category: z.string().trim().min(2).optional(),
  type: jobTypeEnum.optional(),
  locationType: locationTypeEnum.optional(),
  location: z.string().trim().min(2).optional(),
  salaryMin: z.coerce.number().nonnegative().optional(),
  salaryMax: z.coerce.number().nonnegative().optional(),
  salaryCurrency: z.string().trim().length(3).optional(),
  skills: z.array(z.string().trim().min(1)).optional(),
  requirements: z.array(z.string().trim().min(1)).optional(),
  benefits: z.array(z.string().trim().min(1)).optional(),
  experienceLevel: experienceLevelEnum.optional(),
  applicationDeadline: z.string().datetime().optional(),
  status: z.enum(["active", "closed", "draft"]).optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  type: jobTypeEnum.optional(),
  locationType: locationTypeEnum.optional(),
  location: z.string().trim().optional(),
  minSalary: z.coerce.number().nonnegative().optional(),
  maxSalary: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "oldest", "salary_high", "salary_low"]).optional(),
  status: z.enum(["active", "closed", "draft", "flagged"]).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
