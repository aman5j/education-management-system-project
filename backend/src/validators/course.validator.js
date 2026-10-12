import { body } from "express-validator";

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const validCourseTypes = ["Online", "Offline"];

const validDurationUnits = [
  "Days",
  "Weeks",
  "Months",
  "Years",
  "Hours",
];

const validStatuses = [
  "Draft",
  "Published",
  "Archived",
];

const requiredText = (field, message) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(message);

export const createCourseValidation = [
  requiredText("courseTitle", "Course title is required.")
    .isLength({ min: 3 })
    .withMessage("Course title must contain at least 3 characters."),

  body("courseType")
    .custom((value) => {
      if (
        typeof value !== "string" ||
        !validCourseTypes.includes(value.trim())
      ) {
        throw new Error(
          "Course type must be Online or Offline."
        );
      }

      return true;
    }),

  // certificateDiploma is intentionally removed.

  requiredText(
    "courseCategory",
    "Course category is required."
  ),

  body("mrp")
    .notEmpty()
    .withMessage("MRP is required.")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("MRP must be a valid non-negative number."),

  body("price")
    .notEmpty()
    .withMessage("Price is required.")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Price must be a valid non-negative number.")
    .bail()
    .custom((price, { req }) => {
      if (Number(price) > Number(req.body.mrp)) {
        throw new Error("Price cannot be greater than MRP.");
      }

      return true;
    }),

  body("displayOrder")
    .notEmpty()
    .withMessage("Display order is required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage("Display order must be 0 or greater."),

  body("duration")
    .notEmpty()
    .withMessage("Duration is required.")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Duration must be greater than 0."),

  body("durationUnit")
    .notEmpty()
    .withMessage("Duration unit is required.")
    .bail()
    .isIn(validDurationUnits)
    .withMessage("Invalid duration unit."),

  body("previewVideo")
    .trim()
    .notEmpty()
    .withMessage("Preview video URL is required.")
    .bail()
    .isURL()
    .withMessage("Preview video must be a valid URL."),

  body("totalLectures")
    .notEmpty()
    .withMessage("Total lectures is required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage("Total lectures must be 0 or greater."),

  body("practicalMarks")
    .notEmpty()
    .withMessage("Practical marks are required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage("Practical marks must be 0 or greater."),

  body("objectiveMarks")
    .notEmpty()
    .withMessage("Objective marks are required.")
    .bail()
    .isInt({ min: 0 })
    .withMessage("Objective marks must be 0 or greater."),

  body("description").custom((value) => {
    if (!stripHtml(value)) {
      throw new Error("Description is required.");
    }

    return true;
  }),

  body("syllabus").custom((value) => {
    if (!stripHtml(value)) {
      throw new Error("Syllabus is required.");
    }

    return true;
  }),

  body("eligibility").custom((value) => {
    if (!stripHtml(value)) {
      throw new Error("Eligibility is required.");
    }

    return true;
  }),

  requiredText(
    "certificateSubject",
    "Certificate subject is required."
  ),

  body("status")
    .notEmpty()
    .withMessage("Course status is required.")
    .bail()
    .isIn(validStatuses)
    .withMessage("Invalid course status."),
];

export const updateCourseValidation =
  createCourseValidation;
