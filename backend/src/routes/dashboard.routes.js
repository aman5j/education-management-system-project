import express from "express";

import {
  getDashboardSummary,
  getRecentAdmissions,
  getFeeSummary,
  getPendingActions,
} from "../controllers/dashboard.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.use(
  authorizeRoles("admin")
);

router.get(
  "/summary",
  getDashboardSummary
);

router.get(
  "/recent-admissions",
  getRecentAdmissions
);

router.get(
  "/fee-summary",
  getFeeSummary
);

router.get(
  "/pending-actions",
  getPendingActions
);

export default router;