import express from "express";

import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
} from "../controllers/student.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import studentUpload from "../middleware/studentUpload.middleware.js";

const router =
  express.Router();

router.use(authenticate);

router.use(
  authorizeRoles("admin")
);

router.get(
  "/",
  getStudents
);

router.get(
  "/:id",
  getStudent
);

router.post(
  "/",
  studentUpload.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
    {
      name: "signature",
      maxCount: 1,
    },
  ]),
  createStudent
);

router.put(
  "/:id",
  studentUpload.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
    {
      name: "signature",
      maxCount: 1,
    },
  ]),
  updateStudent
);

router.delete(
  "/:id",
  deleteStudent
);

router.patch(
  "/:id/status",
  updateStudentStatus
);

export default router;