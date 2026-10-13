
import express from "express";

import {
  getExamResults,
  getExamCandidates,
  getExamResultById,
  saveExamResult,
  publishExamResult,
} from "../controllers/examResult.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getExamResults);

// Keep this route before "/:id".
router.get("/exams/:examId/candidates", getExamCandidates);

router.post("/", saveExamResult);

router.patch("/:id/publish", publishExamResult);

router.get("/:id", getExamResultById);

export default router;
