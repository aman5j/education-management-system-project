
import mongoose from "mongoose";
import User from "../models/User.js";
import Student from "../models/Student.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getLinkedStudent = async (req) => {
  const studentId = req.user?.studentRecord;

  if (!studentId || !mongoose.isValidObjectId(studentId)) {
    return null;
  }

  return Student.findById(studentId);
};

const serializeStudent = (student) => ({
  id: String(student._id),
  rollNo: student.rollNo || "",
  firstName: student.firstName || "",
  surname: student.surname || "",
  fatherName: student.fatherName || "",
  motherName: student.motherName || "",
  dob: student.dob || null,
  gender: student.gender || "",
  mobile: student.mobile || "",
  alternateMobile: student.alternateMobile || "",
  email: student.email || "",
  address: student.address || "",
  pincode: student.pincode || "",
  profileImage: student.profileImage || "",
  status: student.status || "",
});

export const getMyProfile = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    const student = await getLinkedStudent(req);

    if (!student) {
      return fail(
        res,
        404,
        "Your linked student record was not found. Please contact your institute administrator."
      );
    }

    // Read the current login account directly from the database.
    const user = await User.findById(req.user._id).select(
      "name email role"
    );

    if (!user || user.role !== "student") {
      return fail(res, 404, "Student login account not found.");
    }

    return res.status(200).json({
      success: true,
      data: {
        student: serializeStudent(student),
        account: {
          name: user.name || "",
          email: user.email || "",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    const student = await getLinkedStudent(req);

    if (!student) {
      return fail(res, 404, "Linked student record not found.");
    }

    const user = await User.findById(req.user._id);

    if (!user || user.role !== "student") {
      return fail(res, 404, "Student login account not found.");
    }

    // Students cannot change the email used for login.
    // Reject attempts to submit a different email through the API.
    if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
      const requestedEmail = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const currentLoginEmail = String(user.email || "")
        .trim()
        .toLowerCase();

      if (requestedEmail !== currentLoginEmail) {
        return fail(
          res,
          403,
          "You cannot change your login email. Please contact your institute administrator."
        );
      }
    }

    // Only these student fields can be changed by the student.
    // Email is intentionally excluded.
    const allowedFields = [
      "firstName",
      "surname",
      "fatherName",
      "motherName",
      "dob",
      "gender",
      "mobile",
      "alternateMobile",
      "address",
      "pincode",
    ];

    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
        continue;
      }

      const value = req.body[field];

      if (typeof value !== "string" && value !== null) {
        return fail(res, 400, `Invalid value for ${field}.`);
      }

      student[field] =
        field === "dob" && !value
          ? null
          : typeof value === "string"
            ? value.trim()
            : value;
    }

    const firstName = String(student.firstName || "").trim();
    const surname = String(student.surname || "").trim();

    if (firstName.length < 2) {
      return fail(
        res,
        400,
        "First name must contain at least 2 characters."
      );
    }

    if (!student.mobile || !String(student.mobile).trim()) {
      return fail(res, 400, "Mobile number is required.");
    }

    if (student.dob && Number.isNaN(new Date(student.dob).getTime())) {
      return fail(res, 400, "Please enter a valid date of birth.");
    }

    // Save student profile details without modifying either email.
    await student.save();

    // Update only the account display name and phone.
    user.name = [firstName, surname].filter(Boolean).join(" ");
    user.phone = student.mobile || "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your profile has been updated successfully.",
      data: {
        student: serializeStudent(student),
        account: {
          name: user.name || "",
          email: user.email || "",
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "This profile information conflicts with an existing record."
      );
    }

    next(error);
  }
};

export const uploadMyProfilePhoto = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    if (!req.file) {
      return fail(res, 400, "Please select a profile photo.");
    }

    const student = await getLinkedStudent(req);

    if (!student) {
      return fail(res, 404, "Linked student record not found.");
    }

    student.profileImage = `/uploads/students/${req.file.filename}`;
    await student.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully.",
      data: {
        profileImage: student.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};
