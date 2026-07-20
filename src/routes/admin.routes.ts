import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { asyncHandler } from "../utils/asyncHandler";
import {
  adminUserQuerySchema,
  adminJobQuerySchema,
  updateUserStatusSchema,
} from "../validators/admin.schema";
import {
  getAdminStatsHandler,
  listUsersHandler,
  updateUserStatusHandler,
  deleteUserHandler,
  listJobsAdminHandler,
  flagJobHandler,
  unflagJobHandler,
  deleteJobAdminHandler,
} from "../controllers/admin.controller";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/stats", asyncHandler(getAdminStatsHandler));

router.get(
  "/users",
  validateQuery(adminUserQuerySchema),
  asyncHandler(listUsersHandler),
);
router.patch(
  "/users/:id/status",
  validate(updateUserStatusSchema),
  asyncHandler(updateUserStatusHandler),
);
router.delete("/users/:id", asyncHandler(deleteUserHandler));

router.get(
  "/jobs",
  validateQuery(adminJobQuerySchema),
  asyncHandler(listJobsAdminHandler),
);
router.patch("/jobs/:id/flag", asyncHandler(flagJobHandler));
router.patch("/jobs/:id/unflag", asyncHandler(unflagJobHandler));
router.delete("/jobs/:id", asyncHandler(deleteJobAdminHandler));

export default router;
