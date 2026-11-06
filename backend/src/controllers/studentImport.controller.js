
import mongoose from "mongoose";
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
    const dateMatch = student.dob.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!dateMatch) {
      return "Date of Birth must use YYYY-MM-DD format.";
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const parsedDate = new Date(
      Date.UTC(year, month - 1, day)
    );

    const validDate =
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day;

    if (!validDate) {
      return "Date of Birth is invalid.";
    }

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    if (student.dob > todayString) {
      return "Date of Birth cannot be in the future.";
    }

    student.dob = parsedDate;
  } else {
    student.dob = null;
  }

  return null;
};

const getWriteErrors = (error) => {
  if (Array.isArray(error?.writeErrors)) {
    return error.writeErrors;
  }

  if (typeof error?.result?.getWriteErrors === "function") {
    return error.result.getWriteErrors();
  }

  return [];
};

const getDuplicateMessage = (error) => {
  const message = error?.errmsg || error?.message || "";

  if (
    error?.keyPattern?.rollNo ||
    message.toLowerCase().includes("rollno")
  ) {
    return "Roll Number already exists.";
  }

  if (
    error?.keyPattern?.email ||
    message.toLowerCase().includes("email")
  ) {
    return "Email already exists.";
  }

  return "Student record already exists.";
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

    const rejected = [];
    const candidates = [];

    const seenRollNumbers = new Set();
    const seenEmails = new Set();

    // STEP 1: Normalize and validate all rows in memory.
    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;

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

      candidates.push({
        row: rowNumber,
        student,
        _id: new mongoose.Types.ObjectId(),
      });
    }

    if (!candidates.length) {
      return res.status(200).json({
        success: true,
        message: `Imported 0 student(s). ${rejected.length} row(s) rejected.`,
        importedCount: 0,
        rejectedCount: rejected.length,
        imported: [],
        rejected,
      });
    }

    // STEP 2: Check all existing Roll Numbers and Emails
    // using only two database queries.

    const rollConditions = candidates.map(({ student }) => ({
      rollNo: {
        $regex: `^${escapeRegex(student.rollNo)}$`,
        $options: "i",
      },
    }));

    const emailConditions = candidates.map(({ student }) => ({
      email: {
        $regex: `^${escapeRegex(student.email)}$`,
        $options: "i",
      },
    }));

    const [existingRollNumbers, existingEmails] = await Promise.all([
      Student.find({ $or: rollConditions })
        .select("rollNo")
        .lean(),

      Student.find({ $or: emailConditions })
        .select("email")
        .lean(),
    ]);

    const existingRollSet = new Set(
      existingRollNumbers.map((item) =>
        String(item.rollNo).toLowerCase()
      )
    );

    const existingEmailSet = new Set(
      existingEmails.map((item) =>
        String(item.email).toLowerCase()
      )
    );

    const readyToInsert = [];

    for (const candidate of candidates) {
      const { student, row } = candidate;

      const rollKey = student.rollNo.toLowerCase();
      const emailKey = student.email.toLowerCase();

      if (existingRollSet.has(rollKey)) {
        rejected.push({
          row,
          rollNo: student.rollNo,
          message: "Roll Number already exists.",
        });
        continue;
      }

      if (existingEmailSet.has(emailKey)) {
        rejected.push({
          row,
          rollNo: student.rollNo,
          message: "Email already exists.",
        });
        continue;
      }

      readyToInsert.push(candidate);
    }

    if (!readyToInsert.length) {
      return res.status(200).json({
        success: true,
        message: `Imported 0 student(s). ${rejected.length} row(s) rejected.`,
        importedCount: 0,
        rejectedCount: rejected.length,
        imported: [],
        rejected: rejected.sort((a, b) => a.row - b.row),
      });
    }

    // STEP 3: Validate against the actual Mongoose schema
    // before sending the bulk database operation.
    const schemaValidated = [];

    const validationResults = await Promise.all(
      readyToInsert.map(async (candidate) => {
        const document = new Student({
          _id: candidate._id,
          ...candidate.student,
        });

        try {
          await document.validate();

          return {
            candidate,
            document: document.toObject(),
          };
        } catch (error) {
          const message =
            error?.name === "ValidationError"
              ? Object.values(error.errors)
                  .map((item) => item.message)
                  .join(", ")
              : "Student validation failed.";

          return {
            candidate,
            error: message,
          };
        }
      })
    );

    for (const result of validationResults) {
      if (result.error) {
        rejected.push({
          row: result.candidate.row,
          rollNo: result.candidate.student.rollNo,
          message: result.error,
        });
      } else {
        schemaValidated.push({
          ...result.candidate,
          document: result.document,
        });
      }
    }

    if (!schemaValidated.length) {
      return res.status(200).json({
        success: true,
        message: `Imported 0 student(s). ${rejected.length} row(s) rejected.`,
        importedCount: 0,
        rejectedCount: rejected.length,
        imported: [],
        rejected: rejected.sort((a, b) => a.row - b.row),
      });
    }

    // STEP 4: Insert all valid students in one unordered bulk write.
    const operations = schemaValidated.map(({ document }) => ({
      insertOne: {
        document,
      },
    }));

    let writeResult = null;
    let writeErrors = [];

    try {
      writeResult = await Student.bulkWrite(operations, {
        ordered: false,
      });
    } catch (error) {
      writeErrors = getWriteErrors(error);

      // If the database returned no individual write errors,
      // this is a real operation failure, not a row rejection.
      if (!writeErrors.length) {
        throw error;
      }
    }

    const failedIndexes = new Map();

    for (const writeError of writeErrors) {
      failedIndexes.set(
        writeError.index,
        writeError
      );
    }

    const imported = [];

    for (let index = 0; index < schemaValidated.length; index += 1) {
      const candidate = schemaValidated[index];
      const writeError = failedIndexes.get(index);

      if (writeError) {
        rejected.push({
          row: candidate.row,
          rollNo: candidate.student.rollNo,
          message:
            writeError.code === 11000
              ? getDuplicateMessage(writeError)
              : writeError.errmsg ||
                writeError.message ||
                "Unable to create this student.",
        });

        continue;
      }

      imported.push({
        row: candidate.row,
        studentId: candidate._id,
        rollNo: candidate.student.rollNo,
        name: candidate.student.firstName,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${imported.length} student(s). ${rejected.length} row(s) rejected.`,
      importedCount: imported.length,
      rejectedCount: rejected.length,
      imported,
      rejected: rejected.sort((a, b) => a.row - b.row),
    });
  } catch (error) {
    next(error);
  }
};
