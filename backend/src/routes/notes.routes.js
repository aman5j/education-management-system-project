import express from "express";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  requirePermission,
} from "../middleware/permission.middleware.js";

import {
  uploadNotesAttachments,
} from "../middleware/notesUpload.middleware.js";

import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  addNoteAttachments,
  removeNoteAttachment,
  updateNoteStatus,
  deleteNote,
  getStudentNotes,
  getStudentNote,
  adminViewNoteAttachment,
  adminDownloadNoteAttachment,
  studentViewNoteAttachment,
  studentDownloadNoteAttachment,
} from "../controllers/notes.controller.js";

const router = express.Router();

router.use(authenticate);

// ----------------------------------------------------
// STUDENT ROUTES
// ----------------------------------------------------

router.get(
  "/student",
  authorizeRoles("student"),
  getStudentNotes
);

router.get(
  "/student/:id",
  authorizeRoles("student"),
  getStudentNote
);

router.get(
  "/student/:id/files/:fileId/view",
  authorizeRoles("student"),
  studentViewNoteAttachment
);

router.get(
  "/student/:id/files/:fileId/download",
  authorizeRoles("student"),
  studentDownloadNoteAttachment
);

// ----------------------------------------------------
// ADMIN / STAFF ROUTES
// ----------------------------------------------------

router.get(
  "/",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.view"),
  getNotes
);

router.post(
  "/",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.create"),
  uploadNotesAttachments,
  createNote
);

router.get(
  "/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.view"),
  getNoteById
);

router.put(
  "/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.update"),
  updateNote
);

router.post(
  "/:id/attachments",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.update"),
  uploadNotesAttachments,
  addNoteAttachments
);

router.delete(
  "/:id/attachments/:fileId",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.update"),
  removeNoteAttachment
);

router.patch(
  "/:id/status",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.publish"),
  updateNoteStatus
);

router.get(
  "/:id/files/:fileId/view",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.view"),
  adminViewNoteAttachment
);

router.get(
  "/:id/files/:fileId/download",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.view"),
  adminDownloadNoteAttachment
);

router.delete(
  "/:id",
  authorizeRoles("admin", "staff"),
  requirePermission("notes.delete"),
  deleteNote
);

export default router;