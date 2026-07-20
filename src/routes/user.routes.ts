import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { resumeUpload } from "../config/multer";
import { updateProfileSchema } from "../validators/profile.schema";
import {
  updateProfileHandler,
  getSeekerDashboardHandler,
  uploadResumeHandler,
} from "../controllers/user.controller";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    error: "Too many AI requests — please wait a few minutes and try again",
  },
});

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
router.post(
  "/resume",
  requireAuth,
  requireRole("seeker"),
  aiLimiter,
  resumeUpload.single("resume"),
  asyncHandler(uploadResumeHandler),
);

export default router;
