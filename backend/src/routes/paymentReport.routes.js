import express from "express";

import {
  getPaymentReport,
  getPaymentReportFilters,
} from "../controllers/paymentReport.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Payment Reports
|--------------------------------------------------------------------------
| Admin only
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET /api/reports/payment-filters
|--------------------------------------------------------------------------
*/

router.get(
  "/payment-filters",
  authenticate,
  authorizeRoles("admin"),
  getPaymentReportFilters
);

/*
|--------------------------------------------------------------------------
| GET /api/reports/payments
|--------------------------------------------------------------------------
*/

router.get(
  "/payments",
  authenticate,
  authorizeRoles("admin"),
  getPaymentReport
);

export default router;