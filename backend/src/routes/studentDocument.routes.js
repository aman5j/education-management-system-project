
import express from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import studentDocumentUpload from "../middleware/studentDocumentUpload.middleware.js";

import {
  getStudentDocuments,
  uploadStudentDocuments,
  viewStudentDocument,
  downloadStudentDocument,
  deleteStudentDocument,
} from "../controllers/studentDocument.controller.js";

const router = express.Router();

router.use(authenticate);

// The current UI opens the document manager only for users
// who can update student records.
router.use(requirePermission("students.update"));

const uploadDocuments = (req, res, next) => {
  studentDocumentUpload.array("documents", 10)(req, res, (error) => {
    if (!error) return next();

    return res.status(400).json({
      success: false,
      message: error.message || "Document upload failed.",
    });
  });
};

router.get("/:studentId/documents", getStudentDocuments);

router.post(
  "/:studentId/documents",
  uploadDocuments,
  uploadStudentDocuments
);

router.get(
  "/:studentId/documents/:documentId/view",
  viewStudentDocument
);

router.get(
  "/:studentId/documents/:documentId/download",
  downloadStudentDocument
);

router.delete(
  "/:studentId/documents/:documentId",
  deleteStudentDocument
);

export default router;
