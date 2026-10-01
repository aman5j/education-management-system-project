import { body } from "express-validator";

const paymentModes = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
];

const paymentStatuses = [
  "Verified",
  "Pending",
  "Failed",
  "Overdue",
];

export const createPaymentValidation = [
  body("student_id")
    .trim()
    .notEmpty()
    .withMessage("Student is required.")
    .isMongoId()
    .withMessage("Invalid student ID."),

  body("admission_id")
    .trim()
    .notEmpty()
    .withMessage("Admission is required.")
    .isMongoId()
    .withMessage("Invalid admission ID."),

  body("amount")
    .notEmpty()
    .withMessage("Payment amount is required.")
    .isFloat({ min: 0.01 })
    .withMessage(
      "Payment amount must be greater than zero."
    ),

  body("payment_date")
    .notEmpty()
    .withMessage("Payment date is required.")
    .isISO8601()
    .withMessage("Invalid payment date."),

  body("payment_mode")
    .notEmpty()
    .withMessage("Payment mode is required.")
    .isIn(paymentModes)
    .withMessage(
      "Invalid payment mode."
    ),

  body("receipt_no")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Receipt number cannot exceed 100 characters."
    ),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Notes cannot exceed 1000 characters."
    ),

  body("status")
    .optional()
    .isIn(paymentStatuses)
    .withMessage(
      "Invalid payment status."
    ),
];

export const updatePaymentValidation = [
  body("student_id")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid student ID."),

  body("admission_id")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid admission ID."),

  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage(
      "Payment amount must be greater than zero."
    ),

  body("payment_date")
    .optional()
    .isISO8601()
    .withMessage("Invalid payment date."),

  body("payment_mode")
    .optional()
    .isIn(paymentModes)
    .withMessage(
      "Invalid payment mode."
    ),

  body("receipt_no")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Receipt number cannot exceed 100 characters."
    ),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Notes cannot exceed 1000 characters."
    ),

  body("status")
    .optional()
    .isIn(paymentStatuses)
    .withMessage(
      "Invalid payment status."
    ),
];

export default {
  createPaymentValidation,
  updatePaymentValidation,
};