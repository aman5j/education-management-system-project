import express from "express";

import {
  getAdmissionReport,
  getAdmissionReportFilters,
} from "../controllers/admissionReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admission Report Filters
|--------------------------------------------------------------------------
| Admin only
*/
router.get(
  "/admission-filters",
  authenticate,
  authorizeRoles("admin"),
  getAdmissionReportFilters
);

/*
|--------------------------------------------------------------------------
| Admission Report
|--------------------------------------------------------------------------
| Admin only
*/
router.get(
  "/admissions",
  authenticate,
  authorizeRoles("admin"),
  getAdmissionReport
);

export default router;