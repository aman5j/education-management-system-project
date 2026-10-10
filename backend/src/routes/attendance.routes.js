
import express from "express";

import {
  getAttendance,
  createAttendance,
  updateAttendance,
} from "../controllers/attendance.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getAttendance);
router.post("/", createAttendance);
router.patch("/:id", updateAttendance);

export default router;
