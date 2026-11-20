
import express from "express";

import {
  getWebsiteTeamSettings,
  uploadWebsiteTeamImage,
  updateWebsiteTeamSettings,
  getPublicWebsiteTeamSettings,
} from "../controllers/websiteTeam.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint.
router.get(
  "/public/our-team",
  getPublicWebsiteTeamSettings
);

// Admin-only endpoints.
router.get(
  "/our-team",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteTeamSettings
);

router.put(
  "/our-team",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteTeamSettings
);

router.post(
  "/our-team/images",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteTeamImage
);

export default router;
