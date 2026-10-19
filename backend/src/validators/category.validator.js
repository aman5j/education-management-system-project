
import { body } from "express-validator";

const categoryNameRule = () =>
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Category name must be between 2 and 100 characters."
    );

const displayOrderRule = () =>
  body("displayOrder")
    .notEmpty()
    .withMessage("Display order is required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage(
      "Display order must be a whole number of 0 or greater."
    );

const statusRule = () =>
  body("status")
    .notEmpty()
    .withMessage("Category status is required.")
    .bail()
    .isIn(["Active", "Inactive"])
    .withMessage("Status must be Active or Inactive.");

export const createCategoryValidation = [
  categoryNameRule(),
  displayOrderRule(),
  statusRule(),
];

export const updateCategoryValidation = [
  body("categoryName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Category name must be between 2 and 100 characters."
    ),

  body("displayOrder")
    .optional()
    .notEmpty()
    .withMessage("Display order cannot be empty.")
    .bail()
    .isInt({ min: 0 })
    .withMessage(
      "Display order must be a whole number of 0 or greater."
    ),

  body("status")
    .optional()
    .notEmpty()
    .withMessage("Status cannot be empty.")
    .bail()
    .isIn(["Active", "Inactive"])
    .withMessage("Status must be Active or Inactive."),
];
