
import express from "express";

import {
  getWebsiteFooterSettings,
  updateWebsiteFooterSettings,
  getPublicWebsiteFooter,
} from "../controllers/websiteFooter.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// PUBLIC: Website footer data.
router.get(
  "/public/footer",
  getPublicWebsiteFooter
);

// ADMIN: Get footer settings.
router.get(
  "/footer",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteFooterSettings
);

// ADMIN: Update footer settings.
router.put(
  "/footer",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteFooterSettings
);

export default router;
