
import express from "express";
import rateLimit from "express-rate-limit";

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

const createAuthLimiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      code: "TENANT_AUTH_RATE_LIMITED",
      message,
    },
  });

const loginLimiter = createAuthLimiter(
  10,
  "Too many login attempts. Please try again later."
);

const refreshLimiter = createAuthLimiter(
  30,
  "Too many session refresh requests. Please try again later."
);

router.post("/login", loginLimiter, tenantLogin);
router.post("/refresh", refreshLimiter, tenantRefresh);
router.post("/logout", tenantLogout);

router.get("/me", authenticateTenant, tenantMe);

router.put(
  "/change-password",
  authenticateTenant,
  tenantChangePassword
);

export default router;
