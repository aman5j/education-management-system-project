import express from "express";

import {
  getExamResultById,
} from "../controllers/examResult.controller.js";

import {
  getAdminUpdateMarksList,
  getAdminFinalResult,
  updateAdminFinalResult,
  publishAdminFinalResult,
} from "../controllers/adminFinalResult.controller.js";

import {
  getExamResultReview,
} from "../controllers/examResultReview.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes in this file are Admin-only.
router.use(authenticate);
router.use(authorizeRoles("admin"));

/*
|--------------------------------------------------------------------------
| Admin Update Marks
|--------------------------------------------------------------------------
*/

// List submitted exam attempts.
router.get(
  "/admin/update-marks",
  getAdminUpdateMarksList
);

// Get one result for the Update Marks editor.
router.get(
  "/admin/update-marks/:id",
  getAdminFinalResult
);

// Update only obtained marks.
// Total marks, percentage, grade and pass/fail are calculated server-side.
router.patch(
  "/admin/update-marks/:id",
  updateAdminFinalResult
);

// Publish the final result.
// Published results become locked.
router.patch(
  "/admin/update-marks/:id/publish",
  publishAdminFinalResult
);

/*
|--------------------------------------------------------------------------
| Read-only Exam Answer Sheet
|--------------------------------------------------------------------------
*/

// Used by ExamAnswerSheet.jsx.
// This route must remain available.
router.get(
  "/:id/review",
  getExamResultReview
);

/*
|--------------------------------------------------------------------------
| Single Exam Result
|--------------------------------------------------------------------------
*/

// Retained for compatibility with any existing Admin consumer.
router.get(
  "/:id",
  getExamResultById
);

export default router;