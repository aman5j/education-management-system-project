
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

// View admissions
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

// Delete admission.
// The current permission catalog has no admissions.delete key,
// so use admissions.update until a dedicated permission is added.
router.delete(
  "/:id",
  requirePermission("admissions.update"),
  deleteAdmission
);

export default router;
