
import express from "express";

import {
  getPaymentReport,
  getPaymentReportFilters,
} from "../controllers/paymentReport.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(requirePermission("reports.view"));

router.get("/payment-filters", getPaymentReportFilters);
router.get("/payments", getPaymentReport);

export default router;
