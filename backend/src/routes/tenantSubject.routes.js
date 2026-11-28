import express from "express";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";
import { requireTenantPermission } from "../middleware/tenantAuthorization.middleware.js";

import {
  getTenantSubjects,
  getTenantSubject,
  createTenantSubject,
  updateTenantSubject,
  updateTenantSubjectStatus,
  deleteTenantSubject,
} from "../controllers/tenantSubject.controller.js";

const router = express.Router();

// Resolve the institute from trusted request context.
// Never accept institute IDs or collection prefixes from the browser.
router.use(resolveTenant, attachTenantModels);

// All Subject management endpoints require tenant authentication.
router.use(authenticateTenant);

router
  .route("/")
  .get(
    requireTenantPermission("subjects.view"),
    getTenantSubjects
  )
  .post(
    requireTenantPermission("subjects.create"),
    createTenantSubject
  );

router
  .route("/:id")
  .get(
    requireTenantPermission("subjects.view"),
    getTenantSubject
  )
  .patch(
    requireTenantPermission("subjects.update"),
    updateTenantSubject
  )
  .delete(
    requireTenantPermission("subjects.delete"),
    deleteTenantSubject
  );

router.patch(
  "/:id/status",
  requireTenantPermission("subjects.update"),
  updateTenantSubjectStatus
);

// Important:
// No Question Bank endpoints are registered here.
// Existing legacy Question Bank routes remain untouched.

export default router;