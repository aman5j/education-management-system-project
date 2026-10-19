
import express from "express";

import {
  getAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
} from "../controllers/admission.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  createAdmissionValidation,
  updateAdmissionValidation,
} from "../validators/admission.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(authenticate);

// View admissions list and individual admission
router.get(
  "/",
  requirePermission("admissions.view"),
  getAdmissions
);

router.get(
  "/:id",
  requirePermission("admissions.view"),
  getAdmission
);

// Create admission
router.post(
  "/",
  requirePermission("admissions.create"),
  createAdmissionValidation,
  validationMiddleware,
  createAdmission
);

// Update admission
router.put(
  "/:id",
  requirePermission("admissions.update"),
  updateAdmissionValidation,
  validationMiddleware,
  updateAdmission
);

// Delete admission: use the existing update permission until
// a dedicated admissions.delete permission is added.
router.delete(
  "/:id",
  requirePermission("admissions.update"),
  deleteAdmission
);

export default router;
