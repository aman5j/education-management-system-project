
import express from "express";

import {
  tenantLogin,
  tenantRefresh,
  tenantLogout,
  tenantMe,
  tenantChangePassword,
} from "../controllers/tenantAuth.controller.js";

import {
  authenticateTenant,
} from "../middleware/tenantAuth.middleware.js";

const router = express.Router();

router.post("/login", tenantLogin);
router.post("/refresh", tenantRefresh);
router.post("/logout", tenantLogout);

router.get("/me", authenticateTenant, tenantMe);

router.put(
  "/change-password",
  authenticateTenant,
  tenantChangePassword
);

export default router;
