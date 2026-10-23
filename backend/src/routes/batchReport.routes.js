
import express from "express";

import {
  getBatchReport,
  getBatchReportFilters,
} from "../controllers/batchReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/batch-filters", getBatchReportFilters);
router.get("/batches", getBatchReport);

export default router;
