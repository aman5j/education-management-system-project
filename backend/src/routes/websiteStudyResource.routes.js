
import express from "express";

import {
  getWebsiteStudyResources,
  updateWebsiteStudyResources,
  uploadWebsiteStudyResourceImage,
  getPublicWebsiteStudyResources,
} from "../controllers/websiteStudyResource.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public read-only endpoint.
router.get(
  "/public/study-resources",
  getPublicWebsiteStudyResources
);

// Admin-only settings and image upload.
router.get(
  "/study-resources",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteStudyResources
);

router.put(
  "/study-resources",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteStudyResources
);

router.post(
  "/study-resources/images",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteStudyResourceImage
);

export default router;
