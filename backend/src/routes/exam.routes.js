
import express from "express";

import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} from "../controllers/exam.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);

// Read exams
router.get(
  "/",
  requirePermission("exams.view"),
  getExams
);

router.get(
  "/:id",
  requirePermission("exams.view"),
  getExamById
);

// Create an exam
router.post(
  "/",
  requirePermission("exams.create"),
  createExam
);

// Update an exam
router.patch(
  "/:id",
  requirePermission("exams.update"),
  updateExam
);

// Delete an exam
router.delete(
  "/:id",
  requirePermission("exams.delete"),
  deleteExam
);

export default router;
