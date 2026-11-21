import express from "express";

import {
  getWebsiteContactSettings,
  updateWebsiteContactSettings,
  getPublicContactData,
} from "../controllers/websiteContact.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public Contact Us data
router.get(
  "/public/contact",
  getPublicContactData
);

// Admin Contact Us settings
router.get(
  "/contact",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteContactSettings
);

router.put(
  "/contact",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteContactSettings
);

export default router;