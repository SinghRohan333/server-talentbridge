import { Request, Response } from "express";
import {
  applyToJob,
  getApplicationsForJob,
  getMyApplications,
  updateApplicationStatus,
} from "../services/application.service";

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

export async function getApplicationsForJobHandler(
  req: Request,
  res: Response,
) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await getApplicationsForJob(
    req.user!.id,
    req.params.jobId as string,
    page,
    limit,
  );
  res.status(200).json(result);
}

export async function updateApplicationStatusHandler(
  req: Request,
  res: Response,
) {
  const application = await updateApplicationStatus(
    req.user!.id,
    req.params.id as string,
    req.body.status,
  );
  res.status(200).json({ application });
}
