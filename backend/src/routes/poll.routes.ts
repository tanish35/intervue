import express from "express";
import {
  createPoll,
  joinPoll,
  addQuestion,
  activateQuestion,
  submitAnswer,
  getPollHistory,
} from "../controllers/poll.controller";
import requireAuth from "../middleware/auth";

const router = express.Router();

// Poll management routes
router.post("/", requireAuth, createPoll);
router.post("/join", requireAuth, joinPoll);

// Question management routes
router.post("/:code/question", requireAuth, addQuestion);
router.post(
  "/:code/question/:questionId/activate",
  requireAuth,
  activateQuestion
);
router.post("/:code/question/:questionId/answer", requireAuth, submitAnswer);

// Poll history route
router.get("/:code/history", requireAuth, getPollHistory);

export default router;
