import express from "express";

import {
  createStudentAccount,
  getStudentDashboard,
  linkStudentAccount,
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

// Student-only portal routes.
router.use(authenticate);
router.use(authorizeRoles("student"));

router.get("/dashboard", getStudentDashboard);

export default router;