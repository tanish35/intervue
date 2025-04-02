import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
// import jwt from "jsonwebtoken";
import { Server } from "socket.io";

let io: Server;
export const setSocketIOInstance = (socketIOInstance: Server) => {
  io = socketIOInstance;
};

export const createPoll = asyncHandler(async (req: Request, res: Response) => {
  const code = `POLL-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // @ts-ignore
  const userId = req.user.id;

  const poll = await prisma.poll.create({
    data: {
      title: req.body.title,
      status: "ACTIVE",
      code,
      creator: { connect: { id: userId } },
      questions: {
        create: [],
      },
    },
  });

  io.of("/").adapter.on("create-room", (room) => {
    if (room === code) console.log(`Poll room ${code} created`);
  });

  res.json(poll);
});

export const addQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { text, options, timer } = req.body;

  // @ts-ignore
  const userId = req.user.id;

  const poll = await prisma.poll.findUnique({
    where: { code },
    select: { creatorId: true },
  });

  if (!poll || poll.creatorId !== userId) {
    res.status(403);
    throw new Error("Not authorized to add questions to this poll");
  }

  const question = await prisma.question.create({
    data: {
      text,
      timer,
      status: "PENDING",
      poll: { connect: { code } },
      options: {
        create: options.map((option: string) => ({ text: option })),
      },
    },
    include: { options: true },
  });

  res.status(201).json(question);
});

export const activateQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, questionId } = req.params;

    // @ts-ignore
    const userId = req.user.id;

    const poll = await prisma.poll.findUnique({
      where: { code },
      select: { id: true, creatorId: true },
    });

    if (!poll || poll.creatorId !== userId) {
      res.status(403);
      throw new Error("Not authorized to activate questions in this poll");
    }

    const activatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { status: "ACTIVE" },
      include: { options: true },
    });

    io.to(code).emit("question-activated", {
      question: {
        id: activatedQuestion.id,
        text: activatedQuestion.text,
        options: activatedQuestion.options,
        timer: activatedQuestion.timer,
      },
    });

    setTimeout(async () => {
      await prisma.question.update({
        where: { id: questionId },
        data: { status: "CLOSED" },
      });

      const results = await prisma.answer.groupBy({
        by: ["optionId"],
        where: { questionId },
        _count: true,
      });
      const correctOption = activatedQuestion.options.find(
        (option) => option.isCorrect
      );
      const totalAnswers = results.reduce(
        (sum, result) => sum + result._count,
        0
      );
      const processedResults = results.map((result) => ({
        ...result,
        percentage: totalAnswers > 0 ? (result._count / totalAnswers) * 100 : 0,
      }));

      io.to(code).emit("question-results", {
        questionId,
        results: processedResults,
        correctOption: correctOption ? correctOption.id : null,
      });
    }, activatedQuestion.timer * 1000);

    res.json(activatedQuestion);
  }
);

export const submitAnswer = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, questionId } = req.params;
    const { optionId } = req.body;

    //@ts-ignore
    const userId = req.user.id;

    const [question, existingAnswer] = await Promise.all([
      prisma.question.findUnique({ where: { id: questionId } }),
      prisma.answer.findFirst({
        where: { userId, option: { questionId } },
      }),
    ]);

    if (!question || question.status !== "ACTIVE") {
      res.status(400);
      throw new Error("Question not active");
    }

    if (existingAnswer) {
      res.status(400);
      throw new Error("Already answered this question");
    }

    const answer = await prisma.answer.create({
      data: {
        user: { connect: { id: userId } },
        option: { connect: { id: optionId } },
        question: { connect: { id: questionId } },
      },
    });
    const answerCount = await prisma.answer.count({
      where: { questionId },
    });

    io.to(code).emit("answer-update", {
      questionId,
      answerCount,
    });

    res.json(answer);
  }
);
