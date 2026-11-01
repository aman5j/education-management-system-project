import express from "express";

import {
  refreshCertificateQr,
} from "../controllers/certificateQr.controller.js";

import {
  getCertificates,
  getEligibleCertificateResults,
  generateCertificate,
  getCertificateById,
} from "../controllers/certificate.controller.js";

import {
  shareCertificate,
} from "../controllers/certificateSharing.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All certificate management endpoints are Admin-only.
router.use(authenticate);
router.use(authorizeRoles("admin"));

// Certificate list.
router.get("/", getCertificates);

// Eligible published results.
router.get(
  "/eligible-students",
  getEligibleCertificateResults
);

// Generate PDF certificate.
router.post(
  "/generate/:resultId",
  generateCertificate
);

// Share a generated certificate with its linked student.
router.patch(
  "/:id/share",
  shareCertificate
);


router.post(
  "/:id/refresh-qr",
  refreshCertificateQr
);

// Certificate detail.
router.get(
  "/:id",
  getCertificateById
);

export default router;