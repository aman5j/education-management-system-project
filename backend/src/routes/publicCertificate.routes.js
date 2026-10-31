
import express from "express";

import {
  verifyCertificatePublic,
} from "../controllers/certificate.controller.js";

const router = express.Router();

// Public QR verification.
// No authentication required.
router.get(
  "/verify/:verificationCode",
  verifyCertificatePublic
);

export default router;
