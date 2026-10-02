import express from "express";
import { verifyReceipt } from "../controllers/receipt.controller.js";

const router = express.Router();

// New recommended API
router.get("/verify/:receiptNo", verifyReceipt);

export default router;