
import express from "express";

import {
  getWebsiteMenuSettings,
  updateWebsiteMenuSettings,
} from "../controllers/websiteMenu.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Authentication applies ONLY to Menu endpoints.
router.get(
  "/menu",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteMenuSettings
);

router.put(
  "/menu",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteMenuSettings
);

export default router;
