import { Request, Response } from "express";
import { updateProfile, getSeekerDashboard } from "../services/user.service";
import { sanitizeUser } from "../services/auth.service";

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await updateProfile(req.user!.id, req.body);
  res.status(200).json({ user: sanitizeUser(user) });
}

export async function getSeekerDashboardHandler(req: Request, res: Response) {
  const dashboard = await getSeekerDashboard(req.user!.id);
  res.status(200).json(dashboard);
}
