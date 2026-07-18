import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../types/models";

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET,
    ) as AccessTokenPayload;
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // invalid/expired token on a public route — just proceed unauthenticated
  }
  next();
}
