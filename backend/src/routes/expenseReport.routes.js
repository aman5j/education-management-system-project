import express from "express";

import { getExpenseReport } from "../controllers/expenseReport.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/expenses",
  requirePermission("reports.view"),
  getExpenseReport
);

export default router;
