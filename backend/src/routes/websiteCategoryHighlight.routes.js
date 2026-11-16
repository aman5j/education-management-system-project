import express from "express";

import {
  getWebsiteCategoryHighlights,
  updateWebsiteCategoryHighlights,
  uploadWebsiteCategoryHighlightIcon,
} from "../controllers/websiteCategoryHighlight.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public read endpoint for the website.
router.get(
  "/category-highlights",
  getWebsiteCategoryHighlights
);

// Admin-only management endpoints.
router.put(
  "/category-highlights",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteCategoryHighlights
);

router.post(
  "/category-highlights/icons",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteCategoryHighlightIcon
);

export default router;