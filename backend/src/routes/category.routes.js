import express from "express";

import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

import categoryUpload from "../middleware/categoryUpload.middleware.js";
// import categoryUpload from "../middlewares/categoryUpload.middleware.js";

import {
  createCategoryValidation,
  updateCategoryValidation,
} from "../validators/category.validator.js";

import validationMiddleware from "../middleware/validationMiddleware.js";

const router =
  express.Router();

router.use(authenticate);

router.use(
  authorizeRoles("admin")
);

router.get(
  "/",
  getCategories
);

router.get(
  "/:id",
  getCategory
);

router.post(
  "/",
  categoryUpload.single(
    "categoryIcon"
  ),
  createCategoryValidation,
  validationMiddleware,
  createCategory
);

router.put(
  "/:id",
  categoryUpload.single(
    "categoryIcon"
  ),
  updateCategoryValidation,
  validationMiddleware,
  updateCategory
);

router.delete(
  "/:id",
  deleteCategory
);

export default router;