import { Request, Response } from "express";
import { generateRecommendations } from "../services/ai/recommendation.service";

export async function getRecommendationsHandler(req: Request, res: Response) {
  const forceRefresh = req.query.refresh === "true";
  const result = await generateRecommendations(req.user!.id, forceRefresh);
  res.status(200).json(result);
}
