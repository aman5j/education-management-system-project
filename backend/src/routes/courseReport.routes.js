
import express from "express";

import { getCourseReport } from "../controllers/courseReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/courses", getCourseReport);

export default router;
