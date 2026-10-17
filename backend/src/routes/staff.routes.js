
import express from "express";
import {
  listStaff,
  createStaff,
  updateStaffStatus,
  resetStaffPassword,
} from "../controllers/staff.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", listStaff);
router.post("/", createStaff);

router.patch("/:id/status", updateStaffStatus);
router.patch("/:id/password", resetStaffPassword);

export default router;
