import { Request, Response } from "express";
import {
  sendChatMessage,
  getLatestConversation,
} from "../services/ai/chatAgent.service";

export async function sendMessageHandler(req: Request, res: Response) {
  const { message, conversationId } = req.body as {
    message: string;
    conversationId?: string;
  };
  const result = await sendChatMessage(req.user!.id, message, conversationId);
  res.status(200).json(result);
}

export async function getLatestConversationHandler(
  req: Request,
  res: Response,
) {
  const result = await getLatestConversation(req.user!.id);
  res
    .status(200)
    .json(
      result ?? { conversationId: null, messages: [], suggestedFollowUps: [] },
    );
}
