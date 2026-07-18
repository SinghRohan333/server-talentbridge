import { UserRole } from "./models";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
      };
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
