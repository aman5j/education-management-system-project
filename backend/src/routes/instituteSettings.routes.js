
import express from "express";

import {
  getInstituteSettings,
  getPublicInstituteBranding,
  updateInstituteSettings,
  uploadInstituteLogo as saveInstituteLogo,
  uploadInstituteSettingsAsset,
} from "../controllers/instituteSettings.controller.js";

import uploadInstituteLogo from "../middleware/instituteLogoUpload.js";
import instituteSettingsAssetUpload from "../middleware/instituteSettingsAssetUpload.js";


// Keep all existing settings endpoints protected.
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public, read-only branding for login and other public pages.
router.get("/public-branding", getPublicInstituteBranding);


// --- Protected Routes ---
// Every settings endpoint is admin-only.
router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getInstituteSettings);
router.put("/", updateInstituteSettings);

// Existing endpoint retained for the separate Institute Settings page.
router.post(
  "/logo",
  uploadInstituteLogo.single("logo"),
  saveInstituteLogo
);

// Additional profile/certificate image endpoints.
router.post(
  "/assets/:assetType",
  instituteSettingsAssetUpload.single("image"),
  uploadInstituteSettingsAsset
);

export default router;
