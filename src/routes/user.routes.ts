import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { updateProfileSchema } from "../validators/profile.schema";
import {
  updateProfileHandler,
  getSeekerDashboardHandler,
} from "../controllers/user.controller";

const router = Router();

router.patch(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(updateProfileHandler),
);
router.get(
  "/dashboard/seeker",
  requireAuth,
  requireRole("seeker"),
  asyncHandler(getSeekerDashboardHandler),
);

export default router;
