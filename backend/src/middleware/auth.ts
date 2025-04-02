import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { Request, Response, NextFunction } from "express";

interface JWTPayload {
  sub: string;
  exp: number;
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization header missing" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET!) as JWTPayload;

    if (Date.now() >= decoded.exp * 1000) {
      res.status(401).json({ message: "Token expired" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    //@ts-ignore
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
}

export default requireAuth;
