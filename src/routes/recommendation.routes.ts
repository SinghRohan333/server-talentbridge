import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../utils/asyncHandler";
import { getRecommendationsHandler } from "../controllers/recommendation.controller";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many AI requests — please wait a few minutes" },
});

router.get(
  "/",
  requireAuth,
  requireRole("seeker"),
  aiLimiter,
  asyncHandler(getRecommendationsHandler),
);

export default router;
