import { Request, Response } from "express";
import { submitContactMessage } from "../services/contact.service";

export async function submitContactHandler(req: Request, res: Response) {
  await submitContactMessage(req.body);
  res.status(201).json({ message: "Message received" });
}
