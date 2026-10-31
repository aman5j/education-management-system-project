
import express from "express";

import {
  getCertificates,
  getEligibleCertificateResults,
  generateCertificate,
  getCertificateById,
} from "../controllers/certificate.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All certificate management endpoints are Admin-only.
router.use(authenticate);
router.use(authorizeRoles("admin"));

// Admin certificate list.
router.get("/", getCertificates);

// Published results that do not yet have a certificate.
router.get(
  "/eligible-students",
  getEligibleCertificateResults
);

// Generate a certificate from a published exam result.
router.post(
  "/generate/:resultId",
  generateCertificate
);

// Get one certificate.
router.get("/:id", getCertificateById);

export default router;
