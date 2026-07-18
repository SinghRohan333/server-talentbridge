import { OAuth2Client } from "google-auth-library";
import { getDb } from "../config/db";
import { env } from "../config/env";
import { User, UserRole } from "../types/models";
import { ApiError } from "../middleware/errorHandler";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function usersCollection() {
  return getDb().collection<User>("users");
}

export async function verifyGoogleCredential(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "Google sign-in is not configured on this server");
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new ApiError(401, "Invalid Google credential");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email.split("@")[0],
    avatar: payload.picture ?? null,
  };
}

export async function findOrCreateGoogleUser(
  profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string | null;
  },
  role?: UserRole,
) {
  const users = usersCollection();

  let user = await users.findOne({ googleId: profile.googleId });
  if (user) return user;

  // Existing email/password account with the same email -> link Google to it
  user = await users.findOne({ email: profile.email });
  if (user) {
    await users.updateOne(
      { _id: user._id },
      { $set: { googleId: profile.googleId, updatedAt: new Date() } },
    );
    user.googleId = profile.googleId;
    return user;
  }

  const now = new Date();
  const resolvedRole: UserRole = role ?? "seeker";

  const newUser: User = {
    email: profile.email,
    passwordHash: null,
    googleId: profile.googleId,
    role: resolvedRole,
    name: profile.name,
    avatar: profile.avatar,
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
      resolvedRole === "employer"
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
