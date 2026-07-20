import { Request, Response } from "express";
import {
  updateProfile,
  getSeekerDashboard,
  processResumeUpload,
} from "../services/user.service";
import { sanitizeUser } from "../services/auth.service";
import { ApiError } from "../middleware/errorHandler";

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await updateProfile(req.user!.id, req.body);
  res.status(200).json({ user: sanitizeUser(user) });
}

export async function getSeekerDashboardHandler(req: Request, res: Response) {
  const dashboard = await getSeekerDashboard(req.user!.id);
  res.status(200).json(dashboard);
}

export async function uploadResumeHandler(req: Request, res: Response) {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const user = await processResumeUpload(req.user!.id, req.file);
  res.status(200).json({ user: sanitizeUser(user!) });
}
