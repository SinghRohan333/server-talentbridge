import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { contactSchema } from "../validators/contact.schema";
import { submitContactHandler } from "../controllers/contact.controller";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many attempts, please try again later" },
});

router.post(
  "/",
  contactLimiter,
  validate(contactSchema),
  asyncHandler(submitContactHandler),
);

export default router;
