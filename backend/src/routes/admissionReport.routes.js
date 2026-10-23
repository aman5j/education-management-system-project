
import express from "express";

import {
  getAdmissionReport,
  getAdmissionReportFilters,
} from "../controllers/admissionReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/admission-filters", getAdmissionReportFilters);
router.get("/admissions", getAdmissionReport);

export default router;
