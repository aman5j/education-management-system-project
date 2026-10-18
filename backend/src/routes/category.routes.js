
import express from "express";

import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import categoryUpload from "../middleware/categoryUpload.middleware.js";

import {
  createCategoryValidation,
  updateCategoryValidation,
} from "../validators/category.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router = express.Router();

// Authenticate every request before checking permissions.
router.use(authenticate);

// View categories
router.get(
  "/",
  requirePermission("courses.view"),
  getCategories
);

router.get(
  "/:id",
  requirePermission("courses.view"),
  getCategory
);

// Create a category
router.post(
  "/",
  requirePermission("courses.create"),
  categoryUpload.single("categoryIcon"),
  createCategoryValidation,
  validationMiddleware,
  createCategory
);

// Update a category
router.put(
  "/:id",
  requirePermission("courses.update"),
  categoryUpload.single("categoryIcon"),
  updateCategoryValidation,
  validationMiddleware,
  updateCategory
);

// Delete a category
router.delete(
  "/:id",
  requirePermission("courses.delete"),
  deleteCategory
);

export default router;
