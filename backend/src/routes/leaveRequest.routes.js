import express from "express";

import {
  getLeaveRequests,
  reviewLeaveRequest,
} from "../controllers/leaveRequest.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin", "staff"));

router.get(
  "/",
  requirePermission("attendance.view"),
  getLeaveRequests
);

router.patch(
  "/:id/review",
  requirePermission("attendance.manage"),
  reviewLeaveRequest
);

export default router;