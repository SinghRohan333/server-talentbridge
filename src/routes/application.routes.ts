import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import {
  applyToJobSchema,
  updateApplicationStatusSchema,
} from "../validators/application.schema";
import {
  applyToJobHandler,
  listMyApplicationsHandler,
  getApplicationsForJobHandler,
  updateApplicationStatusHandler,
} from "../controllers/application.controller";

const router = Router();
router.use(requireAuth);

router.get(
  "/mine",
  requireRole("seeker"),
  asyncHandler(listMyApplicationsHandler),
);
router.post(
  "/:jobId",
  requireRole("seeker"),
  validate(applyToJobSchema),
  asyncHandler(applyToJobHandler),
);

router.get(
  "/job/:jobId",
  requireRole("employer"),
  asyncHandler(getApplicationsForJobHandler),
);
router.patch(
  "/:id/status",
  requireRole("employer"),
  validate(updateApplicationStatusSchema),
  asyncHandler(updateApplicationStatusHandler),
);

export default router;
