import express from "express";

import {
  getAdminUpdateMarksList,
  getAdminFinalResult,
  updateAdminFinalResult,
} from "../controllers/adminFinalResult.controller.js";

import {
  getExamResults,
  getExamCandidates,
  getExamResultById,
  saveExamResult,
  publishExamResult,
} from "../controllers/examResult.controller.js";

import {
  getExamResultReview,
  unpublishExamResultForCorrection,
  overrideStudentQuestionMarks,
  previewExamAnswerKeyCorrection,
  applyExamAnswerKeyCorrection,
} from "../controllers/examResultReview.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getExamResults);

// Keep named routes before "/:id".
router.get("/exams/:examId/candidates", getExamCandidates);

router.post(
  "/exams/:examId/answer-key/preview",
  previewExamAnswerKeyCorrection
);

router.post(
  "/exams/:examId/answer-key/apply",
  applyExamAnswerKeyCorrection
);

router.post("/", saveExamResult);

router.patch("/:id/publish", publishExamResult);

router.patch("/:id/unpublish", unpublishExamResultForCorrection);

router.patch(
  "/:id/questions/:questionId/marks",
  overrideStudentQuestionMarks
);

router.get("/:id/review", getExamResultReview);


router.get("/admin/update-marks", getAdminUpdateMarksList);
router.get("/admin/update-marks/:id", getAdminFinalResult);
router.patch("/admin/update-marks/:id", updateAdminFinalResult);


router.get("/:id", getExamResultById);

export default router;