import { Request, Response } from "express";
import {
  getAdminStats,
  listUsers,
  updateUserStatus,
  deleteUserAdmin,
  listJobsAdmin,
  setJobFlag,
  deleteJobAdmin,
} from "../services/admin.service";
import { sanitizeUser } from "../services/auth.service";
import {
  AdminUserQueryInput,
  AdminJobQueryInput,
} from "../validators/admin.schema";

export async function getAdminStatsHandler(_req: Request, res: Response) {
  const stats = await getAdminStats();
  res.status(200).json(stats);
}

export async function listUsersHandler(req: Request, res: Response) {
  const query = req.validatedQuery as AdminUserQueryInput;
  const result = await listUsers(query);
  res.status(200).json(result);
}

export async function updateUserStatusHandler(req: Request, res: Response) {
  const user = await updateUserStatus(
    req.user!.id,
    req.params.id as string,
    req.body.isActive,
  );
  res.status(200).json({ user: sanitizeUser(user!) });
}

export async function deleteUserHandler(req: Request, res: Response) {
  await deleteUserAdmin(req.user!.id, req.params.id as string);
  res.status(200).json({ message: "User deleted" });
}

export async function listJobsAdminHandler(req: Request, res: Response) {
  const query = req.validatedQuery as AdminJobQueryInput;
  const result = await listJobsAdmin(query);
  res.status(200).json(result);
}

export async function flagJobHandler(req: Request, res: Response) {
  const job = await setJobFlag(req.params.id as string, true);
  res.status(200).json({ job });
}

export async function unflagJobHandler(req: Request, res: Response) {
  const job = await setJobFlag(req.params.id as string, false);
  res.status(200).json({ job });
}

export async function deleteJobAdminHandler(req: Request, res: Response) {
  await deleteJobAdmin(req.params.id as string);
  res.status(200).json({ message: "Job deleted" });
}
