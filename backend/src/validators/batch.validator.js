import {
  body,
} from "express-validator";

export const createBatchValidation = [
  body("course_id")
    .trim()
    .notEmpty()
    .withMessage(
      "Course is required."
    )
    .isMongoId()
    .withMessage(
      "Invalid course ID."
    ),

  body("batch_name")
    .trim()
    .notEmpty()
    .withMessage(
      "Batch name is required."
    )
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Batch name must be between 2 and 100 characters."
    ),

  body("max_seats")
    .notEmpty()
    .withMessage(
      "Maximum seats are required."
    )
    .isInt({
      min: 1,
    })
    .withMessage(
      "Maximum seats must be at least 1."
    ),

  body("status")
    .notEmpty()
    .withMessage(
      "Batch status is required."
    )
    .isIn([
      "Ongoing",
      "Upcoming",
      "Closed",
    ])
    .withMessage(
      "Invalid batch status."
    ),
];

export const updateBatchValidation =
  [
    body("course_id")
      .trim()
      .notEmpty()
      .withMessage(
        "Course is required."
      )
      .isMongoId()
      .withMessage(
        "Invalid course ID."
      ),

    body("batch_name")
      .trim()
      .notEmpty()
      .withMessage(
        "Batch name is required."
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        "Batch name must be between 2 and 100 characters."
      ),

    body("max_seats")
      .notEmpty()
      .withMessage(
        "Maximum seats are required."
      )
      .isInt({
        min: 1,
      })
      .withMessage(
        "Maximum seats must be at least 1."
      ),

    body("status")
      .notEmpty()
      .withMessage(
        "Batch status is required."
      )
      .isIn([
        "Ongoing",
        "Upcoming",
        "Closed",
      ])
      .withMessage(
        "Invalid batch status."
      ),
  ];