
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
  getInstitutes,
  createInstitute,
  getInstituteById,
  updateInstitute,
  updateInstituteStatus,
} from "../controllers/platformInstitute.controller.js";

import {
  authenticatePlatform,
  authorizePlatformRoles,
} from "../middleware/platformAuth.middleware.js";

const router = express.Router();

// ==========================================
// PLATFORM AUTHENTICATION
// ==========================================

router.post("/auth/login", platformLogin);
router.post("/auth/refresh", platformRefresh);
router.post("/auth/logout", platformLogout);

router.get(
  "/auth/me",
  authenticatePlatform,
  platformMe
);

// ==========================================
// PROTECTED PLATFORM DASHBOARD
// ==========================================

router.get(
  "/dashboard",
  authenticatePlatform,
  authorizePlatformRoles("super_admin"),
  getPlatformDashboard
);

// ==========================================
// INSTITUTE MANAGEMENT
// ==========================================

router.use(
  "/institutes",
  authenticatePlatform,
  authorizePlatformRoles("super_admin")
);

router
  .route("/institutes")
  .get(getInstitutes)
  .post(createInstitute);

router.get(
  "/institutes/:id",
  getInstituteById
);

router.put(
  "/institutes/:id",
  updateInstitute
);

router.patch(
  "/institutes/:id/status",
  updateInstituteStatus
);

export default router;
