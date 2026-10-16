
import express from "express";

import {
  getInstituteSettings,
  updateInstituteSettings,
  uploadInstituteLogo as saveInstituteLogo,
} from "../controllers/instituteSettings.controller.js";

import uploadInstituteLogo from "../middleware/instituteLogoUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getInstituteSettings);
router.put("/", updateInstituteSettings);

router.post(
  "/logo",
  uploadInstituteLogo.single("logo"),
  saveInstituteLogo
);

export default router;
