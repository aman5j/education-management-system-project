
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

// Delete admission
router.delete(
  "/:id",
  requirePermission("admissions.delete"),
  deleteAdmission
);

export default router;
