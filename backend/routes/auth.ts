// src/routes/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma/prisma";
import { signToken } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // 1) Find the user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // 2) Check the password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // 3) Sign a token that includes their actual role
      const token = signToken({ userId: user.id, role: user.role });

      // 4) Return token + basic user info (including role)
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
