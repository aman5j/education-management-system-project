
import express from "express";

import {
  getAttendanceRoster,
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
} from "../controllers/student.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import studentUpload from "../middleware/studentUpload.middleware.js";

const router = express.Router();

// Authenticate every student-management request first.
router.use(authenticate);

// Attendance roster: keep this before /:id.
router.get(
  "/attendance-roster",
  requirePermission("attendance.view"),
  getAttendanceRoster
);

// Student list and creation.
router
  .route("/")
  .get(requirePermission("students.view"), getStudents)
  .post(
    requirePermission("students.create"),
    studentUpload.fields([
      { name: "profileImage", maxCount: 1 },
      { name: "signature", maxCount: 1 },
    ]),
    createStudent
  );

// Update student status.
router.patch(
  "/:id/status",
  requirePermission("students.update"),
  updateStudentStatus
);

// Individual student: read, update, delete.
router
  .route("/:id")
  .get(requirePermission("students.view"), getStudent)
  .put(
    requirePermission("students.update"),
    studentUpload.fields([
      { name: "profileImage", maxCount: 1 },
      { name: "signature", maxCount: 1 },
    ]),
    updateStudent
  )
  .delete(
    requirePermission("students.delete"),
    deleteStudent
  );

export default router;
