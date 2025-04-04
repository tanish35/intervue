import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { Request, Response, NextFunction } from "express";

interface JWTPayload {
  sub: string;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ message: "Authorization header missing or invalid" });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ message: "Token missing" });
      return;
    }

    const decoded = jwt.verify(token, process.env.SECRET!) as JWTPayload;

    if (!decoded?.sub) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    if (Date.now() >= decoded.exp * 1000) {
      res.status(401).json({ message: "Token expired" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
}

export default requireAuth;
