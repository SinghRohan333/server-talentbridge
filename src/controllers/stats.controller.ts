import { Request, Response } from "express";
import {
  getPublicStats,
  getEmployerDashboard,
} from "../services/stats.service";

export async function getPublicStatsHandler(_req: Request, res: Response) {
  const stats = await getPublicStats();
  res.status(200).json(stats);
}

export async function getEmployerDashboardHandler(req: Request, res: Response) {
  const dashboard = await getEmployerDashboard(req.user!.id);
  res.status(200).json(dashboard);
}
