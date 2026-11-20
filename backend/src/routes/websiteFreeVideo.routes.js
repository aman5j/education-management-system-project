
import express from "express";

import {
  getWebsiteFreeVideoSettings,
  updateWebsiteFreeVideoSettings,
  getPublicWebsiteFreeVideos,
} from "../controllers/websiteFreeVideo.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint.
router.get(
  "/public/free-videos",
  getPublicWebsiteFreeVideos
);

// Admin-only endpoints.
router.get(
  "/free-videos",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteFreeVideoSettings
);

router.put(
  "/free-videos",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteFreeVideoSettings
);

export default router;
