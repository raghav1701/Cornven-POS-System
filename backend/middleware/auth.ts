import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { Role } from "@prisma/client";

// Extend Express.Request so req.user.userId is now a string
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: Role };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * Signs a JWT for given userId (UUID string) + role
 */
export function signToken(payload: { userId: string; role: Role }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

/**
 * Verifies the JWT in Authorization header.
 * On failure, sends 401 or 403 and returns void.
 * On success, sets req.user and calls next().
 */
export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Access denied" });
    return;
  }

  try {
    // throws if invalid or expired
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: Role;
    };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
};

/**
 * Checks req.user.role is one of the allowed roles.
 * If not, sends 403 and returns void; otherwise next().
 */
export const authorizeRoles = (...roles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Access forbidden" });
      return;
    }
    next();
  };
};

/**
 * Helper to get [authenticateToken, authorizeRoles(...roles)]
 * so you can spread it into your routes.
 */
export function requireAuth(...roles: Role[]): RequestHandler[] {
  return [authenticateToken, authorizeRoles(...roles)];
}
