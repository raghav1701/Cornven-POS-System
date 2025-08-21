// src/routes/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma/prisma";
import { signToken } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();



export default router;
