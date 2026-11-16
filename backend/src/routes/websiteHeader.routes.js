
import express from "express";

import {
  getWebsiteHeaderSettings,
  updateWebsiteHeaderSettings,
} from "../controllers/websiteHeader.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Authentication applies ONLY to Header endpoints.
router.get(
  "/header",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteHeaderSettings
);

router.put(
  "/header",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteHeaderSettings
);

export default router;
