import express from "express";

import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getStudentPaymentHistory,
} from "../controllers/payment.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  createPaymentValidation,
  updatePaymentValidation,
} from "../validators/payment.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| GET
|
| Admin → all payments
| Student → own payments only
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authorizeRoles(
    "admin",
    "student"
  ),
  getPayments
);

router.get(
  "/student/:studentId",
  getStudentPaymentHistory
);

router.get(
  "/:id",
  authorizeRoles(
    "admin",
    "student"
  ),
  getPayment
);

/*
|--------------------------------------------------------------------------
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authorizeRoles("admin"),
  createPaymentValidation,
  validationMiddleware,
  createPayment
);

router.put(
  "/:id",
  authorizeRoles("admin"),
  updatePaymentValidation,
  validationMiddleware,
  updatePayment
);

router.delete(
  "/:id",
  authorizeRoles("admin"),
  deletePayment
);

export default router;