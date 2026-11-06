
import Student from "../models/Student.js";

const MAX_STUDENTS_PER_IMPORT = 200;

const normalizeText = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const normalizeEmail = (value) =>
  normalizeText(value).toLowerCase();

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;

  return null;
};

const normalizeStudentRow = (row = {}) => ({
  rollNo: normalizeText(row.rollNo),
  firstName: normalizeText(row.firstName),
  surname: normalizeText(row.surname),
  fatherName: normalizeText(row.fatherName),
  motherName: normalizeText(row.motherName),
  relationship: normalizeText(row.relationship) || "Father",
  dob: normalizeText(row.dob),
  gender: normalizeText(row.gender),
  mobile: normalizeText(row.mobile),
  alternateMobile: normalizeText(row.alternateMobile),
  email: normalizeEmail(row.email),
  address: normalizeText(row.address),
  pincode: normalizeText(row.pincode),
  status: normalizeText(row.status).toLowerCase() || "active",
  showFatherName: parseBoolean(row.showFatherName, true),
  showSurname: parseBoolean(row.showSurname, true),
});

const validateStudent = (student) => {
  if (!student.rollNo) return "Roll Number is required.";
  if (student.rollNo.length > 50) {
    return "Roll Number cannot exceed 50 characters.";
  }

  if (!student.firstName) return "First Name is required.";
  if (student.firstName.length < 2 || student.firstName.length > 80) {
    return "First Name must contain 2–80 characters.";
  }

  if (student.surname.length > 80) {
    return "Surname cannot exceed 80 characters.";
  }

  if (student.fatherName.length > 100) {
    return "Father Name cannot exceed 100 characters.";
  }

  if (student.motherName.length > 100) {
    return "Mother Name cannot exceed 100 characters.";
  }

  if (!student.mobile) return "Mobile Number is required.";
  if (student.mobile.length > 20) {
    return "Mobile Number cannot exceed 20 characters.";
  }

  if (student.alternateMobile.length > 20) {
    return "Alternate Mobile cannot exceed 20 characters.";
  }

  if (!student.email) return "Email is required.";
  if (
    student.email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)
  ) {
    return "Please provide a valid Email address.";
  }

  if (student.address.length > 500) {
    return "Address cannot exceed 500 characters.";
  }

  if (student.pincode.length > 10) {
    return "Pincode cannot exceed 10 characters.";
  }

  if (
    student.gender &&
    !["Male", "Female", "Other"].includes(student.gender)
  ) {
    return "Gender must be Male, Female, or Other.";
  }

  if (!["active", "inactive"].includes(student.status)) {
    return "Status must be active or inactive.";
  }

  if (student.showFatherName === null) {
    return "Show Father Name must be Yes or No.";
  }

  if (student.showSurname === null) {
    return "Show Surname must be Yes or No.";
  }

  if (student.relationship.length > 50) {
    return "Relationship cannot exceed 50 characters.";
  }

  if (student.dob) {
    const parsedDate = new Date(student.dob);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date of Birth is invalid. Use YYYY-MM-DD format.";
    }

    if (parsedDate > new Date()) {
      return "Date of Birth cannot be in the future.";
    }

    student.dob = parsedDate;
  } else {
    student.dob = null;
  }

  return null;
};

const isDuplicate = async (field, value) => {
  const escapedValue = escapeRegex(value);

  return Student.exists({
    [field]: {
      $regex: `^${escapedValue}$`,
      $options: "i",
    },
  });
};

// POST /api/students/import
export const importStudents = async (req, res, next) => {
  try {
    const rows = req.body?.students;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No student records were provided.",
      });
    }

    if (rows.length > MAX_STUDENTS_PER_IMPORT) {
      return res.status(400).json({
        success: false,
        message: `You can import a maximum of ${MAX_STUDENTS_PER_IMPORT} students at a time.`,
      });
    }

    const imported = [];
    const rejected = [];

    const seenRollNumbers = new Set();
    const seenEmails = new Set();

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;

      try {
        const student = normalizeStudentRow(rows[index]);

        const validationError = validateStudent(student);

        if (validationError) {
          rejected.push({
            row: rowNumber,
            rollNo: student.rollNo,
            message: validationError,
          });
          continue;
        }

        const rollKey = student.rollNo.toLowerCase();
        const emailKey = student.email.toLowerCase();

        if (seenRollNumbers.has(rollKey)) {
          rejected.push({
            row: rowNumber,
            rollNo: student.rollNo,
            message: "Duplicate Roll Number inside this Excel file.",
          });
          continue;
        }

        if (seenEmails.has(emailKey)) {
          rejected.push({
            row: rowNumber,
            rollNo: student.rollNo,
            message: "Duplicate Email inside this Excel file.",
          });
          continue;
        }

        seenRollNumbers.add(rollKey);
        seenEmails.add(emailKey);

        if (await isDuplicate("rollNo", student.rollNo)) {
          rejected.push({
            row: rowNumber,
            rollNo: student.rollNo,
            message: "Roll Number already exists.",
          });
          continue;
        }

        if (await isDuplicate("email", student.email)) {
          rejected.push({
            row: rowNumber,
            rollNo: student.rollNo,
            message: "Email already exists.",
          });
          continue;
        }

        const createdStudent = await Student.create({
          rollNo: student.rollNo,
          firstName: student.firstName,
          surname: student.surname,
          fatherName: student.fatherName,
          motherName: student.motherName,
          relationship: student.relationship,
          dob: student.dob,
          gender: student.gender,
          mobile: student.mobile,
          alternateMobile: student.alternateMobile,
          email: student.email,
          address: student.address,
          pincode: student.pincode,
          status: student.status,
          showFatherName: student.showFatherName,
          showSurname: student.showSurname,
        });

        imported.push({
          row: rowNumber,
          studentId: createdStudent._id,
          rollNo: createdStudent.rollNo,
          name: createdStudent.firstName,
        });
      } catch (error) {
        if (error?.code === 11000) {
          const duplicateField = error.keyPattern?.email
            ? "Email"
            : error.keyPattern?.rollNo
              ? "Roll Number"
              : "Student record";

          rejected.push({
            row: rowNumber,
            message: `${duplicateField} already exists.`,
          });
          continue;
        }

        if (error?.name === "ValidationError") {
          rejected.push({
            row: rowNumber,
            message: Object.values(error.errors)
              .map((item) => item.message)
              .join(", "),
          });
          continue;
        }

        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${imported.length} student(s). ${rejected.length} row(s) rejected.`,
      importedCount: imported.length,
      rejectedCount: rejected.length,
      imported,
      rejected,
    });
  } catch (error) {
    next(error);
  }
};
