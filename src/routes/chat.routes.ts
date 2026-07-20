import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { chatMessageSchema } from "../validators/chat.schema";
import {
  sendMessageHandler,
  getLatestConversationHandler,
} from "../controllers/chat.controller";

const router = Router();
router.use(requireAuth, requireRole("seeker"));

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: {
    error: "Too many messages — please wait a few minutes and try again",
  },
});

router.get("/latest", asyncHandler(getLatestConversationHandler));
router.post(
  "/message",
  chatLimiter,
  validate(chatMessageSchema),
  asyncHandler(sendMessageHandler),
);

export default router;
