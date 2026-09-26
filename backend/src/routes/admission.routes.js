import express from "express";

import {
  getAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  updateAdmissionStatus,
  addAdmissionRemark,
} from "../controllers/admission.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getAdmissions);

router.get("/:id", getAdmission);

router.post("/", createAdmission);

router.put("/:id", updateAdmission);

router.delete("/:id", deleteAdmission);

router.patch(
  "/:id/status",
  updateAdmissionStatus
);

router.patch(
  "/:id/remark",
  addAdmissionRemark
);

export default router;