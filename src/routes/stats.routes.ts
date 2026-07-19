import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getPublicStatsHandler } from "../controllers/stats.controller";

const router = Router();
router.get("/public", asyncHandler(getPublicStatsHandler));

export default router;
