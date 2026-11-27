
import express from "express";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import {
  authorizeTenantRoles,
  requireTenantPermission,
} from "../middleware/tenantAuthorization.middleware.js";

import uploadInstituteLogo from "../middleware/instituteLogoUpload.js";

import {
  getTenantInstituteSettings,
  getTenantPublicInstituteBranding,
  getTenantInstituteLogo,
  updateTenantInstituteSettings,
  uploadTenantInstituteLogo,
} from "../controllers/tenantInstituteSettings.controller.js";

const router = express.Router();

// Resolve trusted institute context and register its models.
router.use(
  resolveTenant,
  attachTenantModels
);

// Public tenant-specific branding.
router.get(
  "/public-branding",
  getTenantPublicInstituteBranding
);

router.get(
  "/logo/:version",
  getTenantInstituteLogo
);

// Protected settings APIs.
router.use(authenticateTenant);
router.use(authorizeTenantRoles("admin"));
router.use(requireTenantPermission("settings.manage"));

router.get(
  "/",
  getTenantInstituteSettings
);

router.put(
  "/",
  updateTenantInstituteSettings
);

router.post(
  "/logo",
  uploadInstituteLogo.single("logo"),
  uploadTenantInstituteLogo
);

export default router;
