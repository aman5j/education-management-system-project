
import express from "express";

import {
  getWebsitePlacementSettings,
  uploadWebsitePlacementImage,
  updateWebsitePlacementSettings,
  getPublicWebsitePlacementSettings,
} from "../controllers/websitePlacement.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint.
router.get(
  "/public/placement-stories",
  getPublicWebsitePlacementSettings
);

// Admin-only settings.
router.get(
  "/placement-stories",
  authenticate,
  authorizeRoles("admin"),
  getWebsitePlacementSettings
);

router.put(
  "/placement-stories",
  authenticate,
  authorizeRoles("admin"),
  updateWebsitePlacementSettings
);

router.post(
  "/placement-stories/images",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsitePlacementImage
);

export default router;
