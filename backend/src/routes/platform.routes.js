
import express from "express";

import {
  platformLogin,
  platformRefresh,
  platformLogout,
  platformMe,
} from "../controllers/platformAuth.controller.js";

import {
  getPlatformDashboard,
} from "../controllers/platformDashboard.controller.js";

import {
  authenticatePlatform,
} from "../middleware/platformAuth.middleware.js";

const router = express.Router();

// Platform authentication
router.post("/auth/login", platformLogin);
router.post("/auth/refresh", platformRefresh);
router.post("/auth/logout", platformLogout);
router.get("/auth/me", authenticatePlatform, platformMe);

// Protected platform dashboard
router.get(
  "/dashboard",
  authenticatePlatform,
  getPlatformDashboard
);

export default router;
