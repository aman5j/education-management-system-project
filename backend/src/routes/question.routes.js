
import express from "express";

import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
} from "../controllers/question.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.route("/")
  .get(getQuestions)
  .post(createQuestion);

router.patch("/:id/status", updateQuestionStatus);

router.route("/:id")
  .get(getQuestionById)
  .patch(updateQuestion)
  .delete(deleteQuestion);

export default router;
