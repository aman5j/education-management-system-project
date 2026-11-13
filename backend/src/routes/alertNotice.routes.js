
import express from "express";

import {
  getAdminAlertNotices,
  createAlertNotice,
  updateAlertNotice,
  updateAlertNoticeStatus,
  deleteAlertNotice,
  getStudentAlertNotices,
  dismissStudentAlertNotice,
} from "../controllers/alertNotice.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import alertNoticeUpload from "../middleware/alertNoticeUpload.middleware.js";

const router = express.Router();

router.use(authenticate);

// Admin routes — admin only.
router.get(
  "/admin",
  authorizeRoles("admin"),
  getAdminAlertNotices
);

router.post(
  "/admin",
  authorizeRoles("admin"),
  alertNoticeUpload.single("noticeImage"),
  createAlertNotice
);

router.put(
  "/admin/:id",
  authorizeRoles("admin"),
  alertNoticeUpload.single("noticeImage"),
  updateAlertNotice
);

router.patch(
  "/admin/:id/status",
  authorizeRoles("admin"),
  updateAlertNoticeStatus
);

router.delete(
  "/admin/:id",
  authorizeRoles("admin"),
  deleteAlertNotice
);

// Student routes — each student sees and dismisses notices
// using their own authenticated account.
router.get(
  "/student/active",
  authorizeRoles("student"),
  getStudentAlertNotices
);

router.post(
  "/student/:id/dismiss",
  authorizeRoles("student"),
  dismissStudentAlertNotice
);

export default router;
