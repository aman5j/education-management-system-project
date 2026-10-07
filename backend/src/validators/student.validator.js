import { body } from "express-validator";

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/;

const validRelationships = [
  "Father",
  "Mother",
  "Husband",
  "Guardian",
  "Other",
];

const validGenders = [
  "Male",
  "Female",
  "Other",
];

const validStatuses = [
  "active",
  "inactive",
  "suspended",
];

/*
|--------------------------------------------------------------------------
| COMMON STUDENT VALIDATION
|--------------------------------------------------------------------------
*/

const commonStudentValidation = [
  // FIRST NAME
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage(
      "First name is required."
    )
    .isLength({
      min: 2,
      max: 80,
    })
    .withMessage(
      "First name must be between 2 and 80 characters."
    )
    .matches(
      /^[A-Za-z\s.'-]+$/
    )
    .withMessage(
      "First name can contain only letters, spaces, apostrophes, dots and hyphens."
    ),

  // SURNAME
  body("surname")
    .optional({
      values: "falsy",
    })
    .trim()
    .isLength({
      max: 80,
    })
    .withMessage(
      "Surname cannot exceed 80 characters."
    ),

  // FATHER / HUSBAND NAME
  body("fatherName")
    .optional({
      values: "falsy",
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Father/Husband name cannot exceed 100 characters."
    ),

  // MOTHER NAME
  body("motherName")
    .optional({
      values: "falsy",
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Mother name cannot exceed 100 characters."
    ),

  // RELATIONSHIP
  body("relationship")
    .optional({
      values: "falsy",
    })
    .trim()
    .isIn(validRelationships)
    .withMessage(
      "Invalid relationship selected."
    ),

  // DOB
  body("dob")
    .optional({
      values: "falsy",
    })
    .isISO8601()
    .withMessage(
      "Date of birth must be a valid date."
    )
    .custom((value) => {
      const dob =
        new Date(value);

      const today =
        new Date();

      if (dob > today) {
        throw new Error(
          "Date of birth cannot be in the future."
        );
      }

      return true;
    }),

  // GENDER
  body("gender")
    .optional({
      values: "falsy",
    })
    .isIn(validGenders)
    .withMessage(
      "Invalid gender selected."
    ),

  // MOBILE
  body("mobile")
    .trim()
    .notEmpty()
    .withMessage(
      "Mobile number is required."
    )
    .matches(
      /^[6-9]\d{9}$/
    )
    .withMessage(
      "Mobile number must contain exactly 10 digits and start with 6, 7, 8 or 9."
    ),

  // ALTERNATE MOBILE
  body("alternateMobile")
    .optional({
      values: "falsy",
    })
    .trim()
    .matches(
      /^[6-9]\d{9}$/
    )
    .withMessage(
      "Alternate mobile number must contain exactly 10 digits and start with 6, 7, 8 or 9."
    ),

  // EMAIL
  body("email")
    .optional({
      values: "falsy",
    })
    .trim()
    .isEmail()
    .withMessage(
      "Please enter a valid email address."
    )
    .normalizeEmail(),

  // ADDRESS
  body("address")
    .optional({
      values: "falsy",
    })
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage(
      "Address cannot exceed 500 characters."
    ),

  // PINCODE
  body("pincode")
    .optional({
      values: "falsy",
    })
    .trim()
    .matches(
      /^\d{6}$/
    )
    .withMessage(
      "Pincode must contain exactly 6 digits."
    ),

  // COURSE
  body("course_id")
    .trim()
    .notEmpty()
    .withMessage(
      "Course is required."
    )
    .matches(objectIdRegex)
    .withMessage(
      "Course must be a valid course ID."
    ),

  // BATCH
  body("batch_id")
    .trim()
    .notEmpty()
    .withMessage(
      "Batch is required."
    )
    .matches(objectIdRegex)
    .withMessage(
      "Batch must be a valid batch ID."
    ),

  // STATUS
  body("status")
    .optional({
      values: "falsy",
    })
    .isIn(validStatuses)
    .withMessage(
      "Invalid student status."
    ),

  // CERTIFICATE OPTIONS
  body("showFatherName")
    .optional()
    .isBoolean()
    .withMessage(
      "Show Father/Husband Name must be true or false."
    ),

  body("showSurname")
    .optional()
    .isBoolean()
    .withMessage(
      "Show Surname must be true or false."
    ),
];

/*
|--------------------------------------------------------------------------
| CREATE STUDENT
|--------------------------------------------------------------------------
*/

export const createStudentValidation = [
  body("rollNo")
    .trim()
    .notEmpty()
    .withMessage(
      "Roll number is required."
    )
    .isLength({
      min: 1,
      max: 50,
    })
    .withMessage(
      "Roll number must be between 1 and 50 characters."
    ),

  ...commonStudentValidation,
];

/*
|--------------------------------------------------------------------------
| UPDATE STUDENT
|--------------------------------------------------------------------------
*/

export const updateStudentValidation = [
  body("rollNo")
    .trim()
    .notEmpty()
    .withMessage(
      "Roll number is required."
    )
    .isLength({
      min: 1,
      max: 50,
    })
    .withMessage(
      "Roll number must be between 1 and 50 characters."
    ),

  ...commonStudentValidation,
];