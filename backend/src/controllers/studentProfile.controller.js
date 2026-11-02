
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

    return res.status(200).json({
      success: true,
      data: {
        student: serializeStudent(student),
        account: {
          name: req.user.name || "",
          email: req.user.email || "",
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

    const allowedFields = [
      "firstName",
      "surname",
      "fatherName",
      "motherName",
      "dob",
      "gender",
      "mobile",
      "alternateMobile",
      "email",
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

    // Only perform email ownership checks when the student actually
    // changes the email saved in the Student record.
    const requestedEmail = String(student.email || "")
      .trim()
      .toLowerCase();

    const previousStudentEmail = String(
      Student.isValidObjectId?.(student._id)
        ? student.email || ""
        : ""
    ).trim().toLowerCase();

    // Read the original email from the database before saving.
    const originalStudent = await Student.findById(student._id).select("email");
    const originalStudentEmail = String(
      originalStudent?.email || ""
    ).trim().toLowerCase();

    const emailChanged = requestedEmail !== originalStudentEmail;

    if (emailChanged) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
        return fail(res, 400, "Please enter a valid email address.");
      }

      const [existingStudent, existingUser] = await Promise.all([
        Student.findOne({
          email: requestedEmail,
          _id: { $ne: student._id },
        }).select("_id"),

        User.findOne({
          email: requestedEmail,
          _id: { $ne: user._id },
        }).select("_id"),
      ]);

      if (existingStudent || existingUser) {
        return fail(
          res,
          409,
          "This email address is already being used by another account. Please use a different email."
        );
      }

      student.email = requestedEmail;
      user.email = requestedEmail;
    }

    // Save student details without unnecessarily changing the login email.
    await student.save();

    user.name = [firstName, surname].filter(Boolean).join(" ");
    user.phone = student.mobile || "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your profile has been updated successfully.",
      data: {
        student: serializeStudent(student),
        account: {
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "This email address is already registered. Please use a different email."
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
