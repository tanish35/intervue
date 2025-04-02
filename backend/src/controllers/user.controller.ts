import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import prisma from "../lib/prisma";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const username = req.body.username;

  if (!username) {
    res.status(400).json({ message: "Username is required" });
    return;
  }
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUser) {
    res.status(400).json({ message: "Username already exists" });
    return;
  }
  const user = await prisma.user.create({
    data: { username },
  });
  const exp = Date.now() + 1000 * 60 * 60 * 5;
  const token = jwt.sign({ sub: user.id, exp }, process.env.SECRET!);
  res.status(200).json({ token });
});
