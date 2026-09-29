import express from "express";

import {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
} from "../controllers/batch.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import {
  createBatchValidation,
  updateBatchValidation,
} from "../validators/batch.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router =
  express.Router();

router.use(authenticate);

router.use(
  authorizeRoles("admin")
);

router.get(
  "/",
  getBatches
);

router.get(
  "/:id",
  getBatch
);

router.post(
  "/",
  createBatchValidation,
  validationMiddleware,
  createBatch
);

router.put(
  "/:id",
  updateBatchValidation,
  validationMiddleware,
  updateBatch
);

router.delete(
  "/:id",
  deleteBatch
);

export default router;