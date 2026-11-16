
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

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/menu", getWebsiteMenuSettings);
router.put("/menu", updateWebsiteMenuSettings);

export default router;
