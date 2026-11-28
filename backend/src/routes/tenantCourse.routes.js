
import express from "express";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";
import { requireTenantPermission } from "../middleware/tenantAuthorization.middleware.js";

import tenantCourseImageUpload from "../middleware/tenantCourseImageUpload.middleware.js";

import {
  uploadTenantCourseImage,
  getTenantCourseImage,
  deleteTenantCourseImage,
} from "../controllers/tenantCourseImage.controller.js";

import {
  getTenantCourses,
  getTenantCourse,
  createTenantCourse,
  updateTenantCourse,
  deleteTenantCourse,
  updateTenantCourseStatus,
} from "../controllers/tenantCourse.controller.js";

const router = express.Router();

// Trusted tenant resolution and model registration.
router.use(resolveTenant, attachTenantModels);

// All endpoints require tenant authentication.
router.use(authenticateTenant);

// ------------------------------------
// Tenant Course private image endpoints
// ------------------------------------

router.get(
  "/:id/image",
  requireTenantPermission("courses.view"),
  getTenantCourseImage
);

router.post(
  "/:id/image",
  requireTenantPermission("courses.update"),
  tenantCourseImageUpload,
  uploadTenantCourseImage
);

router.delete(
  "/:id/image",
  requireTenantPermission("courses.update"),
  deleteTenantCourseImage
);

// ------------------------------------
// Tenant Course CRUD endpoints
// ------------------------------------

router.get(
  "/",
  requireTenantPermission("courses.view"),
  getTenantCourses
);

router.get(
  "/:id",
  requireTenantPermission("courses.view"),
  getTenantCourse
);

router.post(
  "/",
  requireTenantPermission("courses.create"),
  createTenantCourse
);

router.put(
  "/:id",
  requireTenantPermission("courses.update"),
  updateTenantCourse
);

router.delete(
  "/:id",
  requireTenantPermission("courses.delete"),
  deleteTenantCourse
);

router.patch(
  "/:id/status",
  requireTenantPermission("courses.update"),
  updateTenantCourseStatus
);

export default router;
