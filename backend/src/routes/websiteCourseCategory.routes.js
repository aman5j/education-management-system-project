
import express from "express";

import {
  getWebsiteCourseCategorySettings,
  updateWebsiteCourseCategorySettings,
  getPublicWebsiteCourseCategories,
} from "../controllers/websiteCourseCategory.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public read endpoint.
// Only selected and Active categories are returned.
router.get(
  "/public/course-categories",
  getPublicWebsiteCourseCategories
);

// Admin-only settings endpoints.
router.get(
  "/course-categories",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteCourseCategorySettings
);

router.put(
  "/course-categories",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteCourseCategorySettings
);

export default router;
