import { Request, Response } from "express";
import { subscribeToNewsletter } from "../services/newsletter.service";

export async function subscribeHandler(req: Request, res: Response) {
  await subscribeToNewsletter(req.body);
  res.status(201).json({ message: "Subscribed" });
}
