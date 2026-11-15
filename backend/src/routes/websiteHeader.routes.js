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

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/header", getWebsiteHeaderSettings);
router.put("/header", updateWebsiteHeaderSettings);

export default router;