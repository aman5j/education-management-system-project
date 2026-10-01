import express from "express";

import {
  getAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
} from "../controllers/admission.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  createAdmissionValidation,
  updateAdmissionValidation,
} from "../validators/admission.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| Admin Admission Management
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authorizeRoles("admin"),
  getAdmissions
);

router.get(
  "/:id",
  authorizeRoles("admin"),
  getAdmission
);

router.post(
  "/",
  authorizeRoles("admin"),
  createAdmissionValidation,
  validationMiddleware,
  createAdmission
);

router.put(
  "/:id",
  authorizeRoles("admin"),
  updateAdmissionValidation,
  validationMiddleware,
  updateAdmission
);

router.delete(
  "/:id",
  authorizeRoles("admin"),
  deleteAdmission
);

export default router;