
import express from "express";

import {
  getWebsiteCertificateSection,
  updateWebsiteCertificateSection,
  uploadWebsiteCertificateSectionImage,
  getPublicWebsiteCertificateSection,
} from "../controllers/websiteCertificateSection.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint must be registered before admin authentication.
router.get(
  "/public/certificate-section",
  getPublicWebsiteCertificateSection
);

// Admin-only Certificate Section settings.
router.get(
  "/certificate-section",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteCertificateSection
);

router.put(
  "/certificate-section",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteCertificateSection
);

router.post(
  "/certificate-section/image",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteCertificateSectionImage
);

export default router;
