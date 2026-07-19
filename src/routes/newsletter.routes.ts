import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { newsletterSchema } from "../validators/newsletter.schema";
import { subscribeHandler } from "../controllers/newsletter.controller";

const router = Router();

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many attempts, please try again later" },
});

router.post(
  "/",
  newsletterLimiter,
  validate(newsletterSchema),
  asyncHandler(subscribeHandler),
);

export default router;
