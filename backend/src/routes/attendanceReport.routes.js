
import express from "express";

import {
  getAttendanceReport,
} from "../controllers/attendanceReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);

// Attendance reports follow the same permission model as
// the main Attendance Management module.
router.get(
  "/attendance",
  requirePermission("attendance.view"),
  getAttendanceReport
);

export default router;
