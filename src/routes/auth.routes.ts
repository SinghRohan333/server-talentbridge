import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth.schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { googleAuth } from "../controllers/auth.controller";
import { googleAuthSchema } from "../validators/auth.schema";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: "Too many attempts, please try again later" },
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(register),
);
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));
router.post(
  "/google",
  authLimiter,
  validate(googleAuthSchema),
  asyncHandler(googleAuth),
);

export default router;
