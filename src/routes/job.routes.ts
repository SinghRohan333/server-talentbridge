import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { optionalAuth } from "../middleware/optionalAuth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
} from "../validators/job.schema";
import {
  createJobHandler,
  listJobsHandler,
  myJobsHandler,
  getJobHandler,
  updateJobHandler,
  deleteJobHandler,
} from "../controllers/job.controller";

const router = Router();

router.get("/", validateQuery(jobQuerySchema), asyncHandler(listJobsHandler));
router.get(
  "/mine",
  requireAuth,
  requireRole("employer"),
  validateQuery(jobQuerySchema),
  asyncHandler(myJobsHandler),
);
router.get("/:id", optionalAuth, asyncHandler(getJobHandler));

router.post(
  "/",
  requireAuth,
  requireRole("employer"),
  validate(createJobSchema),
  asyncHandler(createJobHandler),
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("employer", "admin"),
  validate(updateJobSchema),
  asyncHandler(updateJobHandler),
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("employer", "admin"),
  asyncHandler(deleteJobHandler),
);

export default router;
