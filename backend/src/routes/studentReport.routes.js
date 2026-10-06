import express from "express";

import {
  getStudentReport,
  getStudentReportFilters,
} from "../controllers/studentReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Student Report Filters
|--------------------------------------------------------------------------
*/

router.get(
  "/student-filters",
  authenticate,
  authorizeRoles("admin"),
  getStudentReportFilters
);

/*
|--------------------------------------------------------------------------
| Student Report
|--------------------------------------------------------------------------
*/

router.get(
  "/students",
  authenticate,
  authorizeRoles("admin"),
  getStudentReport
);

export default router;