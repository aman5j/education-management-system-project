
import express from "express";

import {
  getExpenses,
  getExpenseSummary,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getExpenses);
router.get("/summary", getExpenseSummary);
router.get("/:id", getExpense);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;
