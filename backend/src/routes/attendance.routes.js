import express from "express";

import {
  getAttendance,
  createAttendance,
  updateAttendance,
} from "../controllers/attendance.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("attendance.view"),
  getAttendance
);

router.post(
  "/",
  requirePermission("attendance.manage"),
  createAttendance
);

router.patch(
  "/:id",
  requirePermission("attendance.manage"),
  updateAttendance
);

export default router;
