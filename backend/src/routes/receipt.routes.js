import express from "express";

import {
  verifyReceipt,
} from "../controllers/receipt.controller.js";

const router = express.Router();

/*
 * Public route.
 *
 * QR code scanners must be able to verify
 * a receipt without logging into the admin panel.
 */
router.get(
  "/verify/:receiptNo",
  verifyReceipt
);

export default router;