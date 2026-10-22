
import express from "express";

import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getStudentPaymentHistory,
} from "../controllers/payment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  createPaymentValidation,
  updatePaymentValidation,
} from "../validators/payment.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Students may use read endpoints, but the controller must
// enforce ownership. Admins and authorized Staff use permissions.
const requirePaymentRead = (req, res, next) => {
  if (req.user?.role === "student") {
    return next();
  }

  return requirePermission("payments.view")(req, res, next);
};

// Payment list
router.get("/", requirePaymentRead, getPayments);

// Student payment history:
// - Students can access only their own history (controller check).
// - Admin/Staff must have payments.view.
router.get(
  "/student/:studentId",
  requirePaymentRead,
  getStudentPaymentHistory
);

// Single payment details
router.get("/:id", requirePaymentRead, getPayment);

// Create payment: Admin or Staff with payments.manage
router.post(
  "/",
  requirePermission("payments.manage"),
  createPaymentValidation,
  validationMiddleware,
  createPayment
);

// Update payment: Admin or Staff with payments.manage
router.put(
  "/:id",
  requirePermission("payments.manage"),
  updatePaymentValidation,
  validationMiddleware,
  updatePayment
);

// Delete payment: Admin or Staff with payments.manage
router.delete(
  "/:id",
  requirePermission("payments.manage"),
  deletePayment
);

export default router;
