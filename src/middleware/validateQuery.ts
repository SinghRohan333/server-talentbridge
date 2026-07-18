import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
