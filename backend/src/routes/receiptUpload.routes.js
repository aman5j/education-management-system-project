import express from "express";

import uploadReceiptPdf from
  "../controllers/receiptUpload.controller.js";

import receiptUpload from
  "../middleware/receiptUpload.middleware.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/upload",
  authenticate,
  authorizeRoles("admin"),
  receiptUpload.single("receipt"),
  uploadReceiptPdf
);

export default router;