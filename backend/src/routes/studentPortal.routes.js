import express from "express";

import {
  getMyExams,
  getMyExamInstructions,
  startMyExam,
  submitMyExam,
  getMyExamResults,
  getMyExamResultById,
} from "../controllers/studentExam.controller.js";

import {
  createStudentAccount,
  getStudentDashboard,
  getMyCourses,
  getRecommendedCourses,
  getStudentLoginStatus,
  linkStudentAccount,
  resetStudentLoginPassword,
  getMyAttendance,
  getMyFees,
} from "../controllers/studentPortal.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin-only account linking.
// This route must be registered before student-only middleware.
router.post(
  "/admin/link-account",
  authenticate,
  authorizeRoles("admin"),
  linkStudentAccount
);

router.post(
  "/admin/create-account",
  authenticate,
  authorizeRoles("admin"),
  createStudentAccount
);

router.get(
  "/admin/account/:studentId",
  authenticate,
  authorizeRoles("admin"),
  getStudentLoginStatus
);

router.patch(
  "/admin/account/:studentId/password",
  authenticate,
  authorizeRoles("admin"),
  resetStudentLoginPassword
);

// Student-only portal routes.
router.use(authenticate);
router.use(authorizeRoles("student"));

router.get("/dashboard", getStudentDashboard);
router.get("/courses", getMyCourses);
router.get("/recommended-courses", getRecommendedCourses);
router.get("/attendance", getMyAttendance);
router.get("/fees", getMyFees);

router.get("/exams", getMyExams);
router.get("/exams/results", getMyExamResults);
router.get("/exams/results/:resultId", getMyExamResultById);
router.get("/exams/:ticketId/instructions", getMyExamInstructions);
router.post("/exams/:ticketId/start", startMyExam);
router.post("/exams/:ticketId/submit", submitMyExam);

export default router;