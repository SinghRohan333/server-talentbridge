import { Request, Response } from "express";
import {
  saveJob,
  unsaveJob,
  getSavedJobs,
} from "../services/saved-job.service";

export async function saveJobHandler(req: Request, res: Response) {
  const saved = await saveJob(req.user!.id, req.params.jobId);
  res.status(201).json({ saved });
}

export async function unsaveJobHandler(req: Request, res: Response) {
  await unsaveJob(req.user!.id, req.params.jobId);
  res.status(200).json({ message: "Job removed from saved list" });
}

export async function listSavedJobsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const result = await getSavedJobs(req.user!.id, page, limit);
  res.status(200).json(result);
}
