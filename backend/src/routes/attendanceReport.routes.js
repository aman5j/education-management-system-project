
import express from "express";

import {
  getAttendanceReport,
} from "../controllers/attendanceReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/attendance", getAttendanceReport);

export default router;
