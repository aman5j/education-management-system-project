
import express from "express";

import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} from "../controllers/exam.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Every exam endpoint requires authentication and admin access.
router.use(authenticate);
router.use(authorizeRoles("admin"));

router.route("/")
  .get(getExams)
  .post(createExam);

router.route("/:id")
  .get(getExamById)
  .patch(updateExam)
  .delete(deleteExam);

export default router;
