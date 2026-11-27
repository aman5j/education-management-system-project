
import express from "express";

import {
  resolveTenant,
} from "../middleware/tenantResolver.middleware.js";

import {
  attachTenantModels,
} from "../middleware/tenantModelContext.middleware.js";

import {
  authenticateTenant,
} from "../middleware/tenantAuth.middleware.js";

import {
  requireTenantPermission,
} from "../middleware/tenantAuthorization.middleware.js";

import tenantCategoryIconUpload from "../middleware/tenantCategoryIconUpload.middleware.js";

import {
  getTenantCategories,
  getTenantCategory,
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
} from "../controllers/tenantCategory.controller.js";

import {
  uploadTenantCategoryIcon,
  getTenantCategoryIcon,
  deleteTenantCategoryIcon,
} from "../controllers/tenantCategoryIcon.controller.js";

const router = express.Router();

// Resolve trusted institute context.
// Never accept browser-supplied institute IDs or collection prefixes.
router.use(
  resolveTenant,
  attachTenantModels
);

// All category management endpoints require tenant login.
router.use(authenticateTenant);

// ------------------------------
// Category icon endpoints
// ------------------------------

// Retrieve an icon from the current tenant's private storage.
router.get(
  "/:id/icon",
  requireTenantPermission("courses.view"),
  getTenantCategoryIcon
);

// Upload or replace an icon.
router.post(
  "/:id/icon",
  requireTenantPermission("courses.update"),
  tenantCategoryIconUpload,
  uploadTenantCategoryIcon
);

// Remove an icon without deleting the category.
router.delete(
  "/:id/icon",
  requireTenantPermission("courses.update"),
  deleteTenantCategoryIcon
);

// ------------------------------
// Category CRUD endpoints
// ------------------------------

router.get(
  "/",
  requireTenantPermission("courses.view"),
  getTenantCategories
);

router.get(
  "/:id",
  requireTenantPermission("courses.view"),
  getTenantCategory
);

router.post(
  "/",
  requireTenantPermission("courses.create"),
  createTenantCategory
);

router.put(
  "/:id",
  requireTenantPermission("courses.update"),
  updateTenantCategory
);

router.delete(
  "/:id",
  requireTenantPermission("courses.delete"),
  deleteTenantCategory
);

export default router;
