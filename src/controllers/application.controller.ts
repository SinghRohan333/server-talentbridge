import { Request, Response } from "express";
import { applyToJob, getMyApplications } from "../services/application.service";

export async function applyToJobHandler(req: Request, res: Response) {
  const application = await applyToJob(
    req.user!.id,
    req.params.jobId as string,
    req.body,
  );
  res.status(201).json({ application });
}

export async function listMyApplicationsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const result = await getMyApplications(req.user!.id, page, limit);
  res.status(200).json(result);
}
