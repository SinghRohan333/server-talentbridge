import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../utils/asyncHandler";
import {
  saveJobHandler,
  unsaveJobHandler,
  listSavedJobsHandler,
} from "../controllers/saved-job.controller";

const router = Router();
router.use(requireAuth, requireRole("seeker"));

router.get("/", asyncHandler(listSavedJobsHandler));
router.post("/:jobId", asyncHandler(saveJobHandler));
router.delete("/:jobId", asyncHandler(unsaveJobHandler));

export default router;
