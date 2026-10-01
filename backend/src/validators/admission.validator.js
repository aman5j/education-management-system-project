import { body, param } from "express-validator";

const objectIdMessage = "Invalid ID.";

export const createAdmissionValidation = [
  body("student_id")
    .notEmpty()
    .withMessage("Student is required.")
    .isMongoId()
    .withMessage(objectIdMessage),

  body("course_id")
    .notEmpty()
    .withMessage("Course is required.")
    .isMongoId()
    .withMessage(objectIdMessage),

  body("batch_id")
    .notEmpty()
    .withMessage("Batch is required.")
    .isMongoId()
    .withMessage(objectIdMessage),

  body("course_type")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Course type cannot exceed 100 characters."),

  body("course_fee")
    .isFloat({ min: 0 })
    .withMessage("Course fee must be a non-negative number."),

  body("discount_type")
    .optional()
    .isIn(["Amount", "Percentage"])
    .withMessage(
      "Discount type must be Amount or Percentage."
    ),

  body("discount_value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Discount value must be a non-negative number."
    ),

  body("is_gst_taken")
    .optional()
    .isBoolean()
    .withMessage("is_gst_taken must be true or false."),

  body("gst_amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "GST amount must be a non-negative number."
    ),

  body("admission_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Admission fee must be a non-negative number."
    ),

  body("paid_amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Paid amount must be a non-negative number."
    ),

  body("admission_date")
    .notEmpty()
    .withMessage("Admission date is required.")
    .isISO8601()
    .withMessage("Invalid admission date."),

  body("referral_source")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage(
      "Referral source cannot exceed 200 characters."
    ),

  body("status")
    .optional()
    .isIn(["Active", "Completed", "Dropped"])
    .withMessage(
      "Status must be Active, Completed or Dropped."
    ),

  body("remark")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Remark cannot exceed 1000 characters."
    ),
];

export const updateAdmissionValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid admission ID."),

  body("student_id")
    .optional()
    .isMongoId()
    .withMessage(objectIdMessage),

  body("course_id")
    .optional()
    .isMongoId()
    .withMessage(objectIdMessage),

  body("batch_id")
    .optional()
    .isMongoId()
    .withMessage(objectIdMessage),

  body("course_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Course fee must be non-negative."),

  body("discount_type")
    .optional()
    .isIn(["Amount", "Percentage"])
    .withMessage(
      "Discount type must be Amount or Percentage."
    ),

  body("discount_value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Discount value must be non-negative."
    ),

  body("is_gst_taken")
    .optional()
    .isBoolean()
    .withMessage(
      "is_gst_taken must be true or false."
    ),

  body("gst_amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "GST amount must be non-negative."
    ),

  body("admission_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Admission fee must be non-negative."
    ),

  body("paid_amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Paid amount must be non-negative."
    ),

  body("admission_date")
    .optional()
    .isISO8601()
    .withMessage("Invalid admission date."),

  body("status")
    .optional()
    .isIn(["Active", "Completed", "Dropped"])
    .withMessage(
      "Status must be Active, Completed or Dropped."
    ),

  body("remark")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Remark cannot exceed 1000 characters."
    ),
];