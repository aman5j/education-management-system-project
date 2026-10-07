import express from "express";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import studentDocumentUpload from "../middleware/studentDocumentUpload.middleware.js";

import {
  getStudentDocuments,
  uploadStudentDocuments,
  viewStudentDocument,
  downloadStudentDocument,
  deleteStudentDocument,
} from "../controllers/studentDocument.controller.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Multer wrapper
|--------------------------------------------------------------------------
*/

const uploadDocuments = (
  req,
  res,
  next
) => {
  studentDocumentUpload.array(
    "documents",
    10
  )(
    req,
    res,
    (error) => {
      if (!error) {
        next();
        return;
      }

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Document upload failed.",
      });
    }
  );
};

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

router.get(
  "/:studentId/documents",
  authenticate,
  authorizeRoles("admin"),
  getStudentDocuments
);

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
*/

router.post(
  "/:studentId/documents",
  authenticate,
  authorizeRoles("admin"),
  uploadDocuments,
  uploadStudentDocuments
);

/*
|--------------------------------------------------------------------------
| VIEW
|--------------------------------------------------------------------------
*/

router.get(
  "/:studentId/documents/:documentId/view",
  authenticate,
  authorizeRoles("admin"),
  viewStudentDocument
);

/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

router.get(
  "/:studentId/documents/:documentId/download",
  authenticate,
  authorizeRoles("admin"),
  downloadStudentDocument
);

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:studentId/documents/:documentId",
  authenticate,
  authorizeRoles("admin"),
  deleteStudentDocument
);

export default router;