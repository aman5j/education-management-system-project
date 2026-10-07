import express from "express";

import {
  getCourseReport,
} from "../controllers/courseReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

router.get(
  "/courses",
  authenticate,
  authorizeRoles("admin"),
  getCourseReport
);

export default router;