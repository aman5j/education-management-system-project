
import express from "express";

import {
  getStudentReport,
  getStudentReportFilters,
} from "../controllers/studentReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/student-filters", getStudentReportFilters);
router.get("/students", getStudentReport);

export default router;
