import express from "express";

import {
  getBatchReport,
  getBatchReportFilters,
} from "../controllers/batchReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

router.get(
  "/batch-filters",
  authenticate,
  authorizeRoles("admin"),
  getBatchReportFilters
);

router.get(
  "/batches",
  authenticate,
  authorizeRoles("admin"),
  getBatchReport
);

export default router;