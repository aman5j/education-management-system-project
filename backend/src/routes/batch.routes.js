
import express from "express";

import {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
} from "../controllers/batch.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  createBatchValidation,
  updateBatchValidation,
} from "../validators/batch.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router = express.Router();

// Authenticate every request before checking permissions.
router.use(authenticate);

// View batches
router.get(
  "/",
  requirePermission("batches.view"),
  getBatches
);

router.get(
  "/:id",
  requirePermission("batches.view"),
  getBatch
);

// Create a batch
router.post(
  "/",
  requirePermission("batches.create"),
  createBatchValidation,
  validationMiddleware,
  createBatch
);

// Update a batch
router.put(
  "/:id",
  requirePermission("batches.update"),
  updateBatchValidation,
  validationMiddleware,
  updateBatch
);

// Delete a batch
router.delete(
  "/:id",
  requirePermission("batches.delete"),
  deleteBatch
);

export default router;
