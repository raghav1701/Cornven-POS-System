// src/routes/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma/prisma";
import { signToken } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, role } = req.body as {
        email?: string;
        password?: string;
        role?: keyof typeof Role;
      };

      if (!email || !password || !role) {
        res
          .status(400)
          .json({ error: "Email, password and role are all required" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      if (user.role !== Role[role]) {
        res
          .status(403)
          .json({ error: `User is not assigned the role "${role}"` });
        return;
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = signToken({ userId: user.id, role: user.role });

      // note: no `return` here, just `res.json`
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
