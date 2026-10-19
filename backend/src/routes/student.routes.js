
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
} from "../middleware/auth.middleware.js";

import { requirePermission } from "../middleware/permission.middleware.js";
import studentUpload from "../middleware/studentUpload.middleware.js";

const router = express.Router();

router.use(authenticate);

// Attendance-only roster. Keep this before "/:id".
router.get(
  "/attendance-roster",
  requirePermission("attendance.view"),
  getAttendanceRoster
);

// Student list and details
router.get(
  "/",
  requirePermission("students.view"),
  getStudents
);

router.get(
  "/:id",
  requirePermission("students.view"),
  getStudent
);

// Create student
router.post(
  "/",
  requirePermission("students.create"),
  studentUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  createStudent
);

// Update student
router.put(
  "/:id",
  requirePermission("students.update"),
  studentUpload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateStudent
);

// Update student status
router.patch(
  "/:id/status",
  requirePermission("students.update"),
  updateStudentStatus
);

// Delete student
router.delete(
  "/:id",
  requirePermission("students.delete"),
  deleteStudent
);

export default router;
