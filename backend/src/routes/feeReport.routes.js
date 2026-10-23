
import express from "express";

import {
  getFeeReport,
  getFeeReportFilters,
} from "../controllers/feeReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/fee-filters", getFeeReportFilters);
router.get("/fees", getFeeReport);

export default router;
