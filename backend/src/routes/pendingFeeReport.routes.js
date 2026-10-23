
import express from "express";

import {
  getPendingFeeReport,
  getPendingFeeReportFilters,
} from "../controllers/pendingFeeReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/pending-fee-filters", getPendingFeeReportFilters);
router.get("/pending-fees", getPendingFeeReport);

export default router;
