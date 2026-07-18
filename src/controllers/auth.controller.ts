import { Request, Response } from "express";
import { env } from "../config/env";
import {
  registerUser,
  loginUser,
  issueTokens,
  sanitizeUser,
  rotateRefreshToken,
  invalidateRefreshTokens,
  getUserById,
} from "../services/auth.service";
import {
  verifyGoogleCredential,
  findOrCreateGoogleUser,
} from "../services/google-auth.service";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  const { accessToken, refreshToken } = issueTokens(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(201).json({ accessToken, user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response) {
  const user = await loginUser(req.body);
  const { accessToken, refreshToken } = issueTokens(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({ accessToken, user: sanitizeUser(user) });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token)
    return res.status(401).json({ error: "No refresh token provided" });

  const { accessToken, refreshToken } = await rotateRefreshToken(token);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  if (req.user) await invalidateRefreshTokens(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(200).json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  const user = await getUserById(req.user!.id);
  res.status(200).json({ user: sanitizeUser(user) });
}

export async function googleAuth(req: Request, res: Response) {
  const { credential, role } = req.body as {
    credential: string;
    role?: "seeker" | "employer";
  };

  const profile = await verifyGoogleCredential(credential);
  const user = await findOrCreateGoogleUser(profile, role);

  const { accessToken, refreshToken } = issueTokens(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({ accessToken, user: sanitizeUser(user) });
}
