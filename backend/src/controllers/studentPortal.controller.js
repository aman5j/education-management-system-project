import mongoose from "mongoose";

import User from "../models/User.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Attendance from "../models/Attendance.js";
import HallTicket from "../models/HallTicket.js";
import ExamResult from "../models/ExamResult.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

/**
 * POST /api/student-portal/admin/link-account
 *
 * Admin explicitly links a student login account to
 * the corresponding Student record.
 */
export const linkStudentAccount = async (req, res, next) => {
  try {
    const { userId, studentId } = req.body;

    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(studentId)
    ) {
      return fail(res, 400, "Valid userId and studentId are required.");
    }

    const [user, student] = await Promise.all([
      User.findById(userId),
      Student.findById(studentId).select("_id rollNo firstName surname"),
    ]);

    if (!user) {
      return fail(res, 404, "User account not found.");
    }

    if (user.role !== "student") {
      return fail(res, 400, "Only student login accounts can be linked.");
    }

    if (!student) {
      return fail(res, 404, "Student record not found.");
    }

    if (
      user.studentRecord &&
      String(user.studentRecord) !== String(student._id)
    ) {
      return fail(
        res,
        409,
        "This account is already linked to another student record."
      );
    }

    const existingLink = await User.findOne({
      role: "student",
      studentRecord: student._id,
      _id: { $ne: user._id },
    }).select("_id email");

    if (existingLink) {
      return fail(
        res,
        409,
        "This student record is already linked to another login account."
      );
    }

    user.studentRecord = student._id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Student account linked successfully.",
      data: {
        userId: String(user._id),
        studentId: String(student._id),
        rollNo: student.rollNo || "",
        studentName: [student.firstName, student.surname]
          .filter(Boolean)
          .join(" "),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student-portal/dashboard
 *
 * Student ownership comes only from the authenticated
 * account's studentRecord field.
 */
export const getStudentDashboard = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    if (!req.user.studentRecord) {
      return fail(
        res,
        409,
        "Your login account is not linked to a student record. Please contact your institute administrator."
      );
    }

    const student = await Student.findById(req.user.studentRecord)
      .select(
        "rollNo firstName surname fatherName motherName dob gender mobile alternateMobile email address pincode profileImage status"
      )
      .lean();

    if (!student) {
      return fail(
        res,
        404,
        "The student record linked to your account could not be found. Please contact your institute administrator."
      );
    }

    const studentId = student._id;

    const [
      admissions,
      attendanceCounts,
      upcomingTickets,
      publishedResults,
    ] = await Promise.all([
      StudentAdmission.find({ student_id: studentId })
        .populate("course_id", "courseTitle courseType")
        .populate("batch_id", "batch_name status")
        .sort({ admission_date: -1 })
        .lean(),

      Attendance.aggregate([
        { $match: { student_id: studentId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      HallTicket.find({
        student_id: studentId,
        status: "Active",
        examDate: { $gte: new Date() },
      })
        .populate("course_id", "courseTitle")
        .populate("exam_id", "totalQuestions totalMarks")
        .sort({ examDate: 1 })
        .limit(5)
        .lean(),

      ExamResult.find({
        student_id: studentId,
        resultStatus: "Published",
      })
        .populate("course_id", "courseTitle")
        .populate("exam_id", "totalQuestions totalMarks")
        .sort({ publishedAt: -1, updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const attendance = {
      Present: 0,
      Absent: 0,
      Leave: 0,
      Late: 0,
    };

    for (const item of attendanceCounts) {
      if (Object.prototype.hasOwnProperty.call(attendance, item._id)) {
        attendance[item._id] = item.count;
      }
    }

    const summary = admissions.reduce(
      (result, admission) => {
        const finalAmount = Number(admission.final_amount || 0);
        const paidAmount = Number(admission.paid_amount || 0);

        result.totalAdmissions += 1;
        result.totalFees += finalAmount;
        result.totalPaid += paidAmount;
        result.outstandingFees += Math.max(0, finalAmount - paidAmount);

        if (admission.status === "Active") {
          result.activeAdmissions += 1;
        }

        return result;
      },
      {
        totalAdmissions: 0,
        activeAdmissions: 0,
        totalFees: 0,
        totalPaid: 0,
        outstandingFees: 0,
      }
    );

    for (const key of ["totalFees", "totalPaid", "outstandingFees"]) {
      summary[key] = Number(summary[key].toFixed(2));
    }

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: String(student._id),
          rollNo: student.rollNo || "",
          name: [student.firstName, student.surname]
            .filter(Boolean)
            .join(" "),
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
        },
        summary,
        attendance,
        admissions: admissions.map((admission) => ({
          id: String(admission._id),
          course: admission.course_id?.courseTitle || "Course unavailable",
          courseType: admission.course_id?.courseType || "",
          batch: admission.batch_id?.batch_name || "Batch unavailable",
          admissionDate: admission.admission_date || null,
          status: admission.status || "",
          finalAmount: Number(admission.final_amount || 0),
          paidAmount: Number(admission.paid_amount || 0),
          remainingAmount: Math.max(
            0,
            Number(admission.final_amount || 0) -
              Number(admission.paid_amount || 0)
          ),
        })),
        upcomingExams: upcomingTickets.map((ticket) => ({
          id: String(ticket._id),
          hallTicketNo: ticket.hallTicketNo || "",
          examDate: ticket.examDate || null,
          startTime: ticket.startTime || "",
          endTime: ticket.endTime || "",
          reportingTime: ticket.reportingTime || "",
          course: ticket.course_id?.courseTitle || "Course unavailable",
          totalQuestions: ticket.exam_id?.totalQuestions ?? null,
          totalMarks: ticket.exam_id?.totalMarks ?? null,
        })),
        recentResults: publishedResults.map((result) => ({
          id: String(result._id),
          course: result.course_id?.courseTitle || "Course unavailable",
          totalQuestions: result.totalQuestions,
          totalMarks: result.totalMarks,
          obtainedMarks: result.obtainedMarks,
          percentage: result.percentage,
          grade: result.grade,
          passStatus: result.passStatus,
          publishedAt: result.publishedAt || null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};



/**
 * POST /api/student-portal/admin/create-account
 *
 * Creates a student login account and links it to
 * the selected Student record in one operation.
 */

export const createStudentAccount = async (req, res, next) => {
  try {
    const { studentId, password } = req.body;

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(res, 400, "A valid studentId is required.");
    }

    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      return fail(
        res,
        400,
        "Password must contain 12–128 characters."
      );
    }

    const student = await Student.findById(studentId).select(
      "_id firstName surname email rollNo"
    );

    if (!student) {
      return fail(res, 404, "Student record not found.");
    }

    const normalizedEmail = String(student.email || "")
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return fail(
        res,
        400,
        "This student has no valid email. Update the student record first."
      );
    }

    const [existingLink, existingUser] = await Promise.all([
      User.findOne({
        role: "student",
        studentRecord: student._id,
      }).select("_id"),

      User.findOne({ email: normalizedEmail }).select("_id"),
    ]);

    if (existingLink) {
      return fail(
        res,
        409,
        "This student already has a login account. Use password reset instead."
      );
    }

    if (existingUser) {
      return fail(
        res,
        409,
        "This email already belongs to an account. Resolve the existing account before proceeding."
      );
    }

    const name = [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ")
      .trim();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: "student",
      status: "active",
      studentRecord: student._id,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Student login created successfully.",
      data: {
        userId: String(user._id),
        studentId: String(student._id),
        name,
        email: normalizedEmail,
        role: user.role,
        status: user.status,
        initialPassword: password,
        showInitialPasswordOnce: true,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, "An account with this email already exists.");
    }

    next(error);
  }
};




export const getStudentLoginStatus = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(res, 400, "Invalid student ID.");
    }

    const student = await Student.findById(studentId)
      .select("_id email")
      .lean();

    if (!student) {
      return fail(res, 404, "Student record not found.");
    }

    const account = await User.findOne({
      role: "student",
      studentRecord: student._id,
    })
      .select("_id name email role status createdAt lastLoginAt")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        hasLogin: Boolean(account),
        studentId: String(student._id),
        studentEmail: student.email || "",
        account: account
          ? {
              id: String(account._id),
              name: account.name,
              email: account.email,
              role: account.role,
              status: account.status,
              createdAt: account.createdAt,
              lastLoginAt: account.lastLoginAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetStudentLoginPassword = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { password } = req.body;

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(res, 400, "Invalid student ID.");
    }

    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      return fail(
        res,
        400,
        "Password must contain 12–128 characters."
      );
    }

    const account = await User.findOne({
      role: "student",
      studentRecord: studentId,
    }).select("+refreshTokenHash");

    if (!account) {
      return fail(res, 404, "No login account exists for this student.");
    }

    account.password = password;
    account.refreshTokenHash = null;
    account.passwordResetTokenHash = null;
    account.passwordResetExpires = null;

    await account.save();

    return res.status(200).json({
      success: true,
      message: "Student password reset successfully.",
      data: {
        studentId: String(studentId),
        email: account.email,
        showPasswordOnce: true,
      },
    });
  } catch (error) {
    next(error);
  }
};



/**
 * GET /api/student-portal/courses
 *
 * Return only courses belonging to the authenticated student's
 * own admission records.
 */
export const getMyCourses = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    if (!req.user.studentRecord) {
      return fail(
        res,
        409,
        "Your login account is not linked to a student record. Please contact your institute administrator."
      );
    }

    const student = await Student.findById(req.user.studentRecord)
      .select("_id")
      .lean();

    if (!student) {
      return fail(res, 404, "Linked student record not found.");
    }

    const admissions = await StudentAdmission.find({
      student_id: student._id,
    })
      .populate({
        path: "course_id",
        select:
          "courseTitle courseType courseCategory courseImage description syllabus eligibility duration durationUnit totalLectures subjects status",
        populate: {
          path: "subjects",
          select: "subjectName subjectCode description status",
        },
      })
      .populate("batch_id", "batch_name status")
      .sort({ admission_date: -1 })
      .lean();

    const courses = admissions.map((admission) => {
      const course = admission.course_id;
      const batch = admission.batch_id;

      const finalAmount = Number(admission.final_amount || 0);
      const paidAmount = Number(admission.paid_amount || 0);
      const remainingAmount = Math.max(0, finalAmount - paidAmount);

      const paymentPercentage =
        finalAmount > 0
          ? Math.min(
              100,
              Math.round((paidAmount / finalAmount) * 100)
            )
          : 0;

      return {
        admissionId: String(admission._id),
        admissionDate: admission.admission_date || null,
        admissionStatus: admission.status || "Active",
        course: course
          ? {
              id: String(course._id),
              title: course.courseTitle || "Untitled course",
              type: course.courseType || "",
              category: course.courseCategory || "",
              image: course.courseImage || "",
              description: course.description || "",
              syllabus: course.syllabus || "",
              eligibility: course.eligibility || "",
              duration: course.duration ?? null,
              durationUnit: course.durationUnit || "",
              totalLectures: Number(course.totalLectures || 0),
              status: course.status || "",
              subjects: Array.isArray(course.subjects)
                ? course.subjects
                    .filter(Boolean)
                    .map((subject) => ({
                      id: String(subject._id),
                      name: subject.subjectName || "Subject",
                      code: subject.subjectCode || "",
                      description: subject.description || "",
                      status: subject.status || "",
                    }))
                : [],
            }
          : null,
        batch: batch
          ? {
              id: String(batch._id),
              name: batch.batch_name || "Batch",
              status: batch.status || "",
            }
          : null,
        fees: {
          total: finalAmount,
          paid: paidAmount,
          outstanding: remainingAmount,
          paymentPercentage,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};