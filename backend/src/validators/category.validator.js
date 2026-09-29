import {
  body,
} from "express-validator";

export const createCategoryValidation = [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage(
      "Category name is required."
    )
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Category name must be between 2 and 100 characters."
    ),

  body("displayOrder")
    .notEmpty()
    .withMessage(
      "Display order is required."
    )
    .isInt({
      min: 0,
    })
    .withMessage(
      "Display order must be 0 or greater."
    ),

  body("status")
    .notEmpty()
    .withMessage(
      "Category status is required."
    ),
];

export const updateCategoryValidation =
  createCategoryValidation;