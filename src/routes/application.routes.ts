import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { applyToJobSchema } from "../validators/application.schema";
import {
  applyToJobHandler,
  listMyApplicationsHandler,
} from "../controllers/application.controller";

const router = Router();
router.use(requireAuth, requireRole("seeker"));

router.get("/mine", asyncHandler(listMyApplicationsHandler));
router.post(
  "/:jobId",
  validate(applyToJobSchema),
  asyncHandler(applyToJobHandler),
);

export default router;
