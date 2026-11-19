
import express from "express";

import {
  getWebsitePartnerSettings,
  uploadWebsitePartnerLogo,
  updateWebsitePartnerSettings,
  getPublicWebsitePartners,
} from "../controllers/websitePartner.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public read-only endpoint.
router.get(
  "/public/partners",
  getPublicWebsitePartners
);

// Admin-only settings.
router.get(
  "/partners",
  authenticate,
  authorizeRoles("admin"),
  getWebsitePartnerSettings
);

router.put(
  "/partners",
  authenticate,
  authorizeRoles("admin"),
  updateWebsitePartnerSettings
);

router.post(
  "/partners/logos",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsitePartnerLogo
);

export default router;
