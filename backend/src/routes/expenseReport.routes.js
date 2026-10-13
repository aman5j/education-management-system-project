
import express from "express";

import { getExpenseReport } from "../controllers/expenseReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/expenses", getExpenseReport);

export default router;
