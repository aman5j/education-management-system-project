
import express from "express";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  requirePermission,
} from "../middleware/permission.middleware.js";

import {
  uploadAssignmentAttachments,
  uploadAssignmentSubmissionFiles,
} from "../middleware/assignmentUpload.middleware.js";

import {
  adminGetAssignments,
  adminCreateAssignment,
  adminGetAssignment,
  adminUpdateAssignment,
  adminUpdateAssignmentStatus,
  adminDeleteAssignment,
  adminAddAssignmentAttachments,
  adminRemoveAssignmentAttachment,
  adminGetAssignmentSubmissions,
  adminGetSubmissionHistory,
  adminSetStudentResubmission,
  adminDownloadAssignmentFile,
  adminDownloadSubmissionFile,
  adminSaveEvaluation,
  adminGetSubmissionEvaluation,
  adminPublishEvaluation,
  studentGetAssignments,
  studentGetAssignment,
  studentSubmitAssignment,
  studentGetAssignmentHistory,
  studentDownloadAssignmentFile,
  studentDownloadSubmissionFile,
} from "../controllers/assignment.controller.js";

const router = express.Router();

router.use(authenticate);

// =====================================================
// STUDENT ROUTES
// =====================================================

router.get(
  "/student",
  authorizeRoles("student"),
  studentGetAssignments
);

router.get(
  "/student/:id",
  authorizeRoles("student"),
  studentGetAssignment
);

router.post(
  "/student/:id/submit",
  authorizeRoles("student"),
  uploadAssignmentSubmissionFiles,
  studentSubmitAssignment
);

router.get(
  "/student/:id/history",
  authorizeRoles("student"),
  studentGetAssignmentHistory
);

router.get(
  "/student/:id/history/:versionId/files/:fileId/download",
  authorizeRoles("student"),
  studentDownloadSubmissionFile
);

router.get(
  "/student/:id/files/:fileId/download",
  authorizeRoles("student"),
  studentDownloadAssignmentFile
);

// =====================================================
// ADMIN / STAFF ROUTES
// =====================================================

router.get(
  "/admin",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.view"),
  adminGetAssignments
);

router.post(
  "/admin",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.create"),
  uploadAssignmentAttachments,
  adminCreateAssignment
);

router.get(
  "/admin/submissions/:submissionId/files/:fileId",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.submissions.view"),
  adminDownloadSubmissionFile
);

router.get(
  "/admin/submissions/:submissionId/evaluation",
  authorizeRoles("admin"),
  requirePermission("assignments.evaluate"),
  adminGetSubmissionEvaluation
);

router.post(
  "/admin/submissions/:submissionId/evaluation",
  authorizeRoles("admin"),
  requirePermission("assignments.evaluate"),
  adminSaveEvaluation
);

router.patch(
  "/admin/submissions/:submissionId/evaluation/publish",
  authorizeRoles("admin"),
  requirePermission("assignments.evaluate"),
  adminPublishEvaluation
);



// router.post(
//   "/admin/submissions/:submissionId/evaluation",
//   authorizeRoles("admin", "staff"),
//   requirePermission("assignments.evaluate"),
//   adminSaveEvaluation
// );

// router.patch(
//   "/admin/submissions/:submissionId/evaluation/publish",
//   authorizeRoles("admin", "staff"),
//   requirePermission("assignments.evaluate"),
//   adminPublishEvaluation
// );

router.get(
  "/admin/:id/submissions",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.submissions.view"),
  adminGetAssignmentSubmissions
);

router.get(
  "/admin/:id/submissions/:submissionId/history",
  authorizeRoles("admin"),
  requirePermission("assignments.submissions.view"),
  adminGetSubmissionHistory
);

router.patch(
  "/admin/:id/submissions/:submissionId/resubmission",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.resubmission.manage"),
  adminSetStudentResubmission
);

router.get(
  "/admin/:id/files/:fileId/download",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.view"),
  adminDownloadAssignmentFile
);

router.post(
  "/admin/:id/attachments",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.update"),
  uploadAssignmentAttachments,
  adminAddAssignmentAttachments
);

router.delete(
  "/admin/:id/attachments/:fileId",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.update"),
  adminRemoveAssignmentAttachment
);

router.get(
  "/admin/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.view"),
  adminGetAssignment
);

router.put(
  "/admin/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.update"),
  uploadAssignmentAttachments,
  adminUpdateAssignment
);

router.patch(
  "/admin/:id/status",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.publish"),
  adminUpdateAssignmentStatus
);

router.delete(
  "/admin/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("assignments.delete"),
  adminDeleteAssignment
);

export default router;
