import express from "express";
import requireAuth from "../middleware/auth";

import {
  createPoll,
  addQuestion,
  activateQuestion,
  submitAnswer,
} from "../controllers/poll.controller";

const pollRouter = express.Router();

pollRouter.route("/").post(requireAuth, createPoll);
pollRouter.route("/:code/question").post(requireAuth, addQuestion);
pollRouter
  .route("/:code/question/:questionId/activate")
  .post(requireAuth, activateQuestion);
pollRouter
  .route("/:code/question/:questionId/answer")
  .post(requireAuth, submitAnswer);

export default pollRouter;
