
import express from "express";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  adminGetPracticeTests,
  adminCreatePracticeTest,
  adminGetPracticeTest,
  adminUpdatePracticeTest,
  adminUpdatePracticeTestStatus,
  adminDeletePracticeTest,
  adminGetPracticeAttempts,
  adminGetPracticeAttempt,
  studentGetPracticeTests,
  studentGetPracticeInstructions,
  studentStartPracticeTest,
  studentGetPracticeAttempt,
  studentSavePracticeAnswers,
  studentSubmitPracticeTest,
  studentGetPracticeAttempts,
} from "../controllers/practice.controller.js";

const router = express.Router();

router.use(authenticate);

// -------------------- ADMIN --------------------

router.get(
  "/admin/tests",
  authorizeRoles("admin"),
  adminGetPracticeTests
);

router.post(
  "/admin/tests",
  authorizeRoles("admin"),
  adminCreatePracticeTest
);

router.get(
  "/admin/tests/:id",
  authorizeRoles("admin"),
  adminGetPracticeTest
);

router.patch(
  "/admin/tests/:id",
  authorizeRoles("admin"),
  adminUpdatePracticeTest
);

router.patch(
  "/admin/tests/:id/status",
  authorizeRoles("admin"),
  adminUpdatePracticeTestStatus
);

router.delete(
  "/admin/tests/:id",
  authorizeRoles("admin"),
  adminDeletePracticeTest
);

router.get(
  "/admin/attempts",
  authorizeRoles("admin"),
  adminGetPracticeAttempts
);

router.get(
  "/admin/attempts/:id",
  authorizeRoles("admin"),
  adminGetPracticeAttempt
);

// -------------------- STUDENT --------------------

router.get(
  "/student/tests",
  authorizeRoles("student"),
  studentGetPracticeTests
);

router.get(
  "/student/tests/:id",
  authorizeRoles("student"),
  studentGetPracticeInstructions
);

router.post(
  "/student/tests/:id/start",
  authorizeRoles("student"),
  studentStartPracticeTest
);

router.get(
  "/student/attempts",
  authorizeRoles("student"),
  studentGetPracticeAttempts
);

router.get(
  "/student/attempts/:id",
  authorizeRoles("student"),
  studentGetPracticeAttempt
);

router.patch(
  "/student/attempts/:id/answers",
  authorizeRoles("student"),
  studentSavePracticeAnswers
);

router.post(
  "/student/attempts/:id/submit",
  authorizeRoles("student"),
  studentSubmitPracticeTest
);

export default router;
