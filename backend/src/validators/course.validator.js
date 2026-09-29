import {
  body,
} from "express-validator";

const stripHtml = (
  value = ""
) => {
  return String(value)
    .replace(
      /<[^>]*>/g,
      ""
    )
    .replace(
      /&nbsp;/g,
      " "
    )
    .trim();
};

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

export const createCourseValidation = [
  body("courseTitle")
    .trim()
    .notEmpty()
    .withMessage(
      "Course title is required."
    )
    .isLength({ min: 3 })
    .withMessage(
      "Course title must contain at least 3 characters."
    ),

  body("courseType")
    .trim()
    .notEmpty()
    .withMessage(
      "Course type is required."
    ),

  body("certificateDiploma")
    .trim()
    .notEmpty()
    .withMessage(
      "Certificate / Diploma is required."
    ),

  body("courseCategory")
    .trim()
    .notEmpty()
    .withMessage(
      "Course category is required."
    ),

  body("mrp")
    .notEmpty()
    .withMessage(
      "MRP is required."
    )
    .isFloat({ min: 0 })
    .withMessage(
      "MRP must be a valid positive number."
    ),

  body("price")
    .notEmpty()
    .withMessage(
      "Price is required."
    )
    .isFloat({ min: 0 })
    .withMessage(
      "Price must be a valid positive number."
    ),

  body("displayOrder")
    .notEmpty()
    .withMessage(
      "Display order is required."
    )
    .isInt({ min: 0 })
    .withMessage(
      "Display order must be 0 or greater."
    ),

  body("duration")
    .notEmpty()
    .withMessage(
      "Duration is required."
    )
    .isFloat({ gt: 0 })
    .withMessage(
      "Duration must be greater than 0."
    ),

  body("durationUnit")
    .notEmpty()
    .withMessage(
      "Duration unit is required."
    )
    .isIn(validDurationUnits)
    .withMessage(
      "Invalid duration unit."
    ),

  body("previewVideo")
    .trim()
    .notEmpty()
    .withMessage(
      "Preview video URL is required."
    )
    .isURL()
    .withMessage(
      "Preview video must be a valid URL."
    ),

  body("totalLectures")
    .notEmpty()
    .withMessage(
      "Total lectures is required."
    )
    .isInt({ min: 0 })
    .withMessage(
      "Total lectures must be 0 or greater."
    ),

  body("practicalMarks")
    .notEmpty()
    .withMessage(
      "Practical marks are required."
    )
    .isInt({ min: 0 })
    .withMessage(
      "Practical marks must be 0 or greater."
    ),

  body("objectiveMarks")
    .notEmpty()
    .withMessage(
      "Objective marks are required."
    )
    .isInt({ min: 0 })
    .withMessage(
      "Objective marks must be 0 or greater."
    ),

  body("description")
  .custom((value) => {
    if (!stripHtml(value)) {
      throw new Error(
        "Description is required."
      );
    }

    return true;
  }),

body("syllabus")
  .custom((value) => {
    if (!stripHtml(value)) {
      throw new Error(
        "Syllabus is required."
      );
    }

    return true;
  }),

body("eligibility")
  .custom((value) => {
    if (!stripHtml(value)) {
      throw new Error(
        "Eligibility is required."
      );
    }

    return true;
  }),

  body("certificateSubject")
    .trim()
    .notEmpty()
    .withMessage(
      "Certificate subject is required."
    ),

  body("status")
    .notEmpty()
    .withMessage(
      "Course status is required."
    )
    .isIn(validStatuses)
    .withMessage(
      "Invalid course status."
    ),

  body("price").custom(
    (price, { req }) => {
      if (
        Number(price) >
        Number(req.body.mrp)
      ) {
        throw new Error(
          "Price cannot be greater than MRP."
        );
      }

      return true;
    }
  ),
];

export const updateCourseValidation =
  createCourseValidation;