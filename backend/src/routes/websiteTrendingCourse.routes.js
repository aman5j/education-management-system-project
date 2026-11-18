
import express from "express";

import {
  getTrendingCourseSettings,
  updateTrendingCourseSettings,
  getPublicTrendingCourses,
} from "../controllers/websiteTrendingCourse.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public website endpoint.
router.get(
  "/public/trending-courses",
  getPublicTrendingCourses
);

// Admin Website Editor endpoints.
router.get(
  "/trending-courses",
  authenticate,
  authorizeRoles("admin"),
  getTrendingCourseSettings
);

router.put(
  "/trending-courses",
  authenticate,
  authorizeRoles("admin"),
  updateTrendingCourseSettings
);

export default router;
