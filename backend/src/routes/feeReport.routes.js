import express from "express";

import {
  getFeeReport,
  getFeeReportFilters,
} from "../controllers/feeReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

router.get(
  "/fee-filters",
  authenticate,
  authorizeRoles("admin"),
  getFeeReportFilters
);

router.get(
  "/fees",
  authenticate,
  authorizeRoles("admin"),
  getFeeReport
);

export default router;