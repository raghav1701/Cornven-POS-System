import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
// ← pull Role (and any other enums) directly from the generated client
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// signToken still needs the Role type
export function signToken(payload: { userId: number; role: Role }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    // @ts-ignore
    req.user = decoded;
    next();
  });
}

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access forbidden" });
    }
    next();
  };
}

// combine both checks into one reusable middleware
export function requireAuth(...roles: Role[]) {
  return [authenticateToken, authorizeRoles(...roles)];
}
