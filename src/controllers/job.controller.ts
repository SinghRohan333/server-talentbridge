import { Request, Response } from "express";
import {
  createJob,
  getJobs,
  getJobById,
  getSimilarJobs,
  updateJob,
  deleteJob,
  getJobFilterOptions,
} from "../services/job.service";
import { isJobSaved } from "../services/saved-job.service";
import { hasAppliedToJob } from "../services/application.service";
import { JobQueryInput } from "../validators/job.schema";

export async function createJobHandler(req: Request, res: Response) {
  const job = await createJob(req.user!.id, req.body);
  res.status(201).json({ job });
}

export async function listJobsHandler(req: Request, res: Response) {
  const query = req.validatedQuery as JobQueryInput;
  const result = await getJobs(query, { restrictActive: true });
  res.status(200).json(result);
}

export async function myJobsHandler(req: Request, res: Response) {
  const query = req.validatedQuery as JobQueryInput;
  const result = await getJobs(query, {
    restrictActive: false,
    employerId: req.user!.id,
  });
  res.status(200).json(result);
}

export async function getJobHandler(req: Request, res: Response) {
  const job = await getJobById(req.params.id as string, req.user);
  const similar = await getSimilarJobs(job);

  let isSaved = false;
  let hasApplied = false;
  if (req.user?.role === "seeker") {
    [isSaved, hasApplied] = await Promise.all([
      isJobSaved(req.user.id, job._id!.toString()),
      hasAppliedToJob(req.user.id, job._id!.toString()),
    ]);
  }

  res.status(200).json({ job, similar, isSaved, hasApplied });
}

export async function updateJobHandler(req: Request, res: Response) {
  const job = await updateJob(req.params.id as string, req.user!, req.body);
  res.status(200).json({ job });
}

export async function deleteJobHandler(req: Request, res: Response) {
  await deleteJob(req.params.id as string, req.user!);
  res.status(200).json({ message: "Job deleted" });
}

export async function getJobFilterOptionsHandler(_req: Request, res: Response) {
  const options = await getJobFilterOptions();
  res.status(200).json(options);
}
