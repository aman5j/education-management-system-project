
import express from "express";

import uploadExpenseReceipt from "../middleware/expenseReceiptUpload.js";

import {
  getExpenses,
  getExpenseSummary,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceiptFile,
} from "../controllers/expense.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);

// Read operations
router.get(
  "/",
  requirePermission("expenses.view"),
  getExpenses
);

router.get(
  "/summary",
  requirePermission("expenses.view"),
  getExpenseSummary
);

// Keep the static upload route before "/:id".
router.post(
  "/upload-receipt",
  requirePermission("expenses.manage"),
  uploadExpenseReceipt.single("receipt"),
  uploadExpenseReceiptFile
);

router.get(
  "/:id",
  requirePermission("expenses.view"),
  getExpense
);

// Manage operations
router.post(
  "/",
  requirePermission("expenses.manage"),
  createExpense
);

router.put(
  "/:id",
  requirePermission("expenses.manage"),
  updateExpense
);

router.delete(
  "/:id",
  requirePermission("expenses.manage"),
  deleteExpense
);

export default router;
