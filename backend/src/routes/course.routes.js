import express from "express";

import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
} from "../controllers/course.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import courseUpload from "../middleware/courseUpload.middleware.js";

const router = express.Router();

router.use(authenticate);

router.use(
  authorizeRoles("admin")
);

router.get("/", getCourses);

router.get("/:id", getCourse);

router.post(
  "/",
  courseUpload.single("courseImage"),
  createCourse
);

router.put(
  "/:id",
  courseUpload.single("courseImage"),
  updateCourse
);

router.delete(
  "/:id",
  deleteCourse
);

router.patch(
  "/:id/status",
  updateCourseStatus
);

export default router;