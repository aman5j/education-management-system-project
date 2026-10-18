
import express from "express";

import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
  getAttendanceRoster,
} from "../controllers/student.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import { requirePermission } from "../middleware/permission.middleware.js";
import studentUpload from "../middleware/studentUpload.middleware.js";

const router = express.Router();

router.use(authenticate);

// Attendance-only roster: staff with attendance.view can read
// limited student fields for the selected course and batch.
router.get(
  "/attendance-roster",
  requirePermission("attendance.view"),
  getAttendanceRoster
);

// Keep full Student Management APIs Admin-only.
router.use(authorizeRoles("admin"));

router.get("/", getStudents);
router.get("/:id", getStudent);

router.post(
  "/",
  studentUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  createStudent
);

router.put(
  "/:id",
  studentUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateStudent
);

router.delete("/:id", deleteStudent);
router.patch("/:id/status", updateStudentStatus);

export default router;
