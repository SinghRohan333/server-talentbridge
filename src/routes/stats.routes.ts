import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getPublicStatsHandler,
  getEmployerDashboardHandler,
} from "../controllers/stats.controller";

const router = Router();
router.get("/public", asyncHandler(getPublicStatsHandler));
router.get(
  "/employer/dashboard",
  requireAuth,
  requireRole("employer"),
  asyncHandler(getEmployerDashboardHandler),
);

export default router;
