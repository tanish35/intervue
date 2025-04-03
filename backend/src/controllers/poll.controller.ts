import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Server } from "socket.io";
import { io } from "../index";

export const createPoll = asyncHandler(async (req: Request, res: Response) => {
  const code = `POLL-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // @ts-ignore
  const userId = req.user.id;

  const poll = await prisma.poll.create({
    data: {
      title: req.body.title || "New Poll", // Add default title if none provided
      status: "ACTIVE",
      code,
      creator: { connect: { id: userId } },
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  io.of("/").adapter.on("create-room", (room) => {
    if (room === code) console.log(`Poll room ${code} created`);
  });

  res.json(poll);
});

export const getPoll = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const poll = await prisma.poll.findUnique({
    where: { code },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
  if (!poll) {
    res.status(404);
    throw new Error("Poll not found");
  }
  res.json(poll);
});

export const joinPoll = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  //@ts-ignore
  const username = req.user.username;
  //@ts-ignore
  const userId = req.user.id;

  const poll = await prisma.poll.findUnique({
    where: { code },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!poll) {
    res.status(404);
    throw new Error("Poll not found");
  }

  if (poll.status === "CLOSED") {
    res.status(400);
    throw new Error("This poll is closed");
  }

  // Check if username already exists in this poll
  const existingParticipant = poll.participants.find(
    (participant) => participant.userId === userId
  );

  if (existingParticipant) {
    // Return existing data instead of creating duplicate
    res.status(200).json({
      poll,
      message: "User already joined this poll",
    });
    return;
  }

  // Add participant to poll
  const updatedPoll = await prisma.poll.update({
    where: { code },
    data: {
      participants: {
        create: {
          user: { connect: { id: userId } },
        },
      },
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  // Notify all users in room about new participant
  io.to(code).emit("new-participant", {
    user: { id: userId, username },
    poll: updatedPoll,
  });

  res.status(200).json({
    poll: updatedPoll,
    message: "Successfully joined poll",
  });
  return;
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
    // console.log("Hello");

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

    console.log(`⚡ Emitting "question-activated" to room: ${code}`);

    io.to(code).emit("question-activated", {
      question: {
        id: activatedQuestion.id,
        text: activatedQuestion.text,
        options: activatedQuestion.options,
        timer: activatedQuestion.timer,
      },
    });

    console.log(`✅ "question-activated" event emitted to room: ${code}`);

    // console.log("code", code);

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

export const getPollTime = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const poll = await prisma.poll.findUnique({
    where: { code },
    include: { questions: { where: { status: "ACTIVE" } } },
  });

  if (!poll || !poll.questions.length) {
    res.status(404).json({ error: "No active question" });
    return;
  }

  const question = poll.questions[0];
  const now = new Date().valueOf();
  const expiresAt = new Date(question.createdAt);
  expiresAt.setSeconds(expiresAt.getSeconds() + question.timer);
  const expiresAt1 = expiresAt.valueOf();
  const remaining = Math.floor((expiresAt1 - now) / 1000);
  res.json({ remaining: Math.max(0, remaining) });
});

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

// Get poll history (closed questions with results)
export const getPollHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    // @ts-ignore
    const userId = req.user.id;

    const poll = await prisma.poll.findUnique({
      where: { code },
      include: {
        participants: true,
      },
    });

    if (!poll) {
      res.status(404);
      throw new Error("Poll not found");
    }

    // Check if user is creator or participant
    const isCreator = poll.creatorId === userId;
    const isParticipant = poll.participants.some((p) => p.userId === userId);

    if (!isCreator && !isParticipant) {
      res.status(403);
      throw new Error("Not authorized to view this poll");
    }

    // Get closed questions with their options and answers
    const closedQuestions = await prisma.question.findMany({
      where: {
        pollId: poll.id,
        status: "CLOSED",
      },
      include: {
        options: true,
        answers: {
          select: {
            optionId: true,
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Process questions to include result statistics
    const questionsWithResults = closedQuestions.map((question) => {
      const totalAnswers = question.answers.length;
      const options = question.options.map((option) => {
        const optionAnswers = question.answers.filter(
          (a) => a.optionId === option.id
        );
        const answerCount = optionAnswers.length;
        const percentage =
          totalAnswers > 0 ? (answerCount / totalAnswers) * 100 : 0;

        return {
          ...option,
          _count: answerCount,
          percentage,
        };
      });

      // Find user's answer if they're a participant
      const userAnswer = isParticipant
        ? question.answers.find((a) => a.userId === userId)?.optionId
        : null;

      return {
        id: question.id,
        text: question.text,
        timer: question.timer,
        status: question.status,
        options: options,
        userAnswerId: userAnswer,
      };
    });

    res.json({
      pollId: poll.id,
      code: poll.code,
      title: poll.title,
      history: questionsWithResults,
    });
  }
);
