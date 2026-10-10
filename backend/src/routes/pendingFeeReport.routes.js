import express from "express";

import {
  getPendingFeeReport,
  getPendingFeeReportFilters,
} from "../controllers/pendingFeeReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/pending-fee-filters",
  authenticate,
  authorizeRoles("admin"),
  getPendingFeeReportFilters
);

router.get(
  "/pending-fees",
  authenticate,
  authorizeRoles("admin"),
  getPendingFeeReport
);

export default router;