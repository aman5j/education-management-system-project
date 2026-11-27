
import express from "express";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import {
  authenticateTenant,
} from "../middleware/tenantAuth.middleware.js";
import {
  authorizeTenantRoles,
  requireTenantPermission,
} from "../middleware/tenantAuthorization.middleware.js";

import tenantStudentDocumentUpload from "../middleware/tenantStudentDocumentUpload.middleware.js";

import {
  getTenantStudentDocuments,
  uploadTenantStudentDocuments,
  viewTenantStudentDocument,
  downloadTenantStudentDocument,
  deleteTenantStudentDocument,
} from "../controllers/tenantStudentDocument.controller.js";

const router = express.Router();

/*
 * Tenant Student Document APIs
 *
 * Security order:
 * 1. Resolve institute from trusted hostname.
 * 2. Attach institute-specific model accessor.
 * 3. Authenticate tenant user.
 *
 * Never use legacy req.user or legacy authentication here.
 */
router.use(
  resolveTenant,
  attachTenantModels,
  authenticateTenant
);

/*
 * ADMIN / STAFF
 *
 * Manage documents belonging to a selected student.
 * Staff must have students.update permission.
 */

// List student documents
router.get(
  "/students/:studentId/documents",
  authorizeTenantRoles("admin", "staff"),
  requireTenantPermission("students.update"),
  getTenantStudentDocuments
);

// Upload student documents
router.post(
  "/students/:studentId/documents",
  authorizeTenantRoles("admin", "staff"),
  requireTenantPermission("students.update"),
  tenantStudentDocumentUpload,
  uploadTenantStudentDocuments
);

// Preview a student document
router.get(
  "/students/:studentId/documents/:documentId/view",
  authorizeTenantRoles("admin", "staff"),
  requireTenantPermission("students.update"),
  viewTenantStudentDocument
);

// Download a student document
router.get(
  "/students/:studentId/documents/:documentId/download",
  authorizeTenantRoles("admin", "staff"),
  requireTenantPermission("students.update"),
  downloadTenantStudentDocument
);

// Delete a student document
router.delete(
  "/students/:studentId/documents/:documentId",
  authorizeTenantRoles("admin", "staff"),
  requireTenantPermission("students.update"),
  deleteTenantStudentDocument
);

/*
 * STUDENT PORTAL
 *
 * Student identity comes only from the authenticated tenant account.
 * No student ID is accepted from the browser.
 */

// List own documents
router.get(
  "/student-portal/documents",
  authorizeTenantRoles("student"),
  requireTenantPermission("student.documents.view"),
  getTenantStudentDocuments
);

// Preview own document
router.get(
  "/student-portal/documents/:documentId/view",
  authorizeTenantRoles("student"),
  requireTenantPermission("student.documents.view"),
  viewTenantStudentDocument
);

// Download own document
router.get(
  "/student-portal/documents/:documentId/download",
  authorizeTenantRoles("student"),
  requireTenantPermission("student.documents.view"),
  downloadTenantStudentDocument
);

export default router;
