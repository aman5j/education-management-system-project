
import express from "express";

import {
  getWebsiteCareerSettings,
  updateWebsiteCareerSettings,
  getPublicWebsiteCareerSettings,
} from "../controllers/websiteCareer.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint.
router.get(
  "/public/careers",
  getPublicWebsiteCareerSettings
);

// Admin-only endpoints.
router.get(
  "/careers",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteCareerSettings
);

router.put(
  "/careers",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteCareerSettings
);

export default router;
