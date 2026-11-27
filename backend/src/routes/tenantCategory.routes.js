
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

import {
  getTenantCategories,
  getTenantCategory,
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
} from "../controllers/tenantCategory.controller.js";

const router = express.Router();

// Resolve the institute exclusively from the trusted hostname.
// Never accept an institute ID or collection prefix from the browser.
router.use(
  resolveTenant,
  attachTenantModels
);

// All category management endpoints require tenant login.
router.use(authenticateTenant);

// GET: courses.view
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

// POST: courses.create
router.post(
  "/",
  requireTenantPermission("courses.create"),
  createTenantCategory
);

// PUT: courses.update
router.put(
  "/:id",
  requireTenantPermission("courses.update"),
  updateTenantCategory
);

// DELETE: courses.delete
router.delete(
  "/:id",
  requireTenantPermission("courses.delete"),
  deleteTenantCategory
);

export default router;
