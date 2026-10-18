import express from "express";

import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
} from "../controllers/course.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import courseUpload from "../middleware/courseUpload.middleware.js";
import validationMiddleware from "../middleware/validationMiddleware.js";

import {
  createCourseValidation,
  updateCourseValidation,
} from "../validators/course.validator.js";

const router = express.Router();

router.use(authenticate);

// Read courses
router.get("/", requirePermission("courses.view"), getCourses);
router.get("/:id", requirePermission("courses.view"), getCourse);

// Create course
router.post(
  "/",
  requirePermission("courses.create"),
  courseUpload.single("courseImage"),
  createCourseValidation,
  validationMiddleware,
  createCourse
);

// Update course
router.put(
  "/:id",
  requirePermission("courses.update"),
  courseUpload.single("courseImage"),
  updateCourseValidation,
  validationMiddleware,
  updateCourse
);

// Delete course
router.delete(
  "/:id",
  requirePermission("courses.delete"),
  deleteCourse
);

// Status change is an update action
router.patch(
  "/:id/status",
  requirePermission("courses.update"),
  updateCourseStatus
);

export default router;
