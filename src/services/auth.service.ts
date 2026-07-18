import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { env } from "../config/env";
import { User } from "../types/models";
import { ApiError } from "../middleware/errorHandler";
import { RegisterInput, LoginInput } from "../validators/auth.schema";

function usersCollection() {
  return getDb().collection<User>("users");
}

function signAccessToken(user: Pick<User, "_id" | "role" | "email">) {
  return jwt.sign(
    { sub: user._id!.toString(), role: user.role, email: user.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

function signRefreshToken(userId: ObjectId, tokenVersion: number) {
  return jwt.sign(
    { sub: userId.toString(), tokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

export function issueTokens(user: User) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user._id!, user.refreshTokenVersion),
  };
}

export function sanitizeUser(user: User) {
  const { passwordHash, refreshTokenVersion, ...safe } = user;
  return safe;
}

export async function registerUser(input: RegisterInput) {
  const users = usersCollection();

  const existing = await users.findOne({ email: input.email });
  if (existing)
    throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();

  const newUser: User = {
    email: input.email,
    passwordHash,
    role: input.role,
    name: input.name,
    avatar: null,
    phone: null,
    location: null,
    bio: null,
    skills: [],
    experience: [],
    education: [],
    resumeUrl: null,
    resumeSummary: null,
    preferredJobTypes: [],
    preferredLocations: [],
    preferredCategories: [],
    company:
      input.role === "employer"
        ? {
            name: "",
            logo: null,
            website: null,
            description: null,
            size: null,
            industry: null,
          }
        : null,
    isActive: true,
    refreshTokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(newUser);
  newUser._id = result.insertedId;
  return newUser;
}

export async function loginUser(input: LoginInput) {
  const users = usersCollection();
  const user = await users.findOne({ email: input.email });

  if (!user || !user.passwordHash)
    throw new ApiError(401, "Invalid email or password");
  if (!user.isActive)
    throw new ApiError(403, "This account has been deactivated");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  return user;
}

export async function rotateRefreshToken(refreshToken: string) {
  let payload: { sub: string; tokenVersion: number };

  try {
    payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET,
    ) as typeof payload;
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const users = usersCollection();
  const user = await users.findOne({ _id: new ObjectId(payload.sub) });

  if (!user || !user.isActive)
    throw new ApiError(401, "Account not found or deactivated");
  if (user.refreshTokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  return issueTokens(user);
}

export async function invalidateRefreshTokens(userId: string) {
  const users = usersCollection();
  await users.updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { refreshTokenVersion: 1 }, $set: { updatedAt: new Date() } },
  );
}

export async function getUserById(userId: string) {
  const users = usersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}
