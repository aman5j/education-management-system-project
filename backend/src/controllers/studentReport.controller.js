import mongoose from "mongoose";

import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";

const DEFAULT_LIMIT = 10;
const ALLOWED_LIMITS = [10, 25, 50];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit = ALLOWED_LIMITS.includes(requestedLimit)
    ? requestedLimit
    : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const getStudentReportFilters = async (req, res, next) => {
  try {
    const [courses, batches] = await Promise.all([
      Course.find({})
        .select("_id courseTitle courseType status")
        .sort({ courseTitle: 1 })
        .lean(),

      Batch.find({})
        .select("_id course_id batch_name status")
        .populate({
          path: "course_id",
          select: "courseTitle courseType",
        })
        .sort({ batch_name: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { courses, batches },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentReport = async (req, res, next) => {
  try {
    const {
      date_from = "",
      date_to = "",
      course_id = "",
      batch_id = "",
      status = "",
      q = "",
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);
    const studentMatch = {};

    if (status) {
      const allowedStatuses = ["active", "inactive"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student status.",
        });
      }

      studentMatch.status = status;
    }

    if (date_from || date_to) {
      const dateFilter = {};

      if (date_from) {
        const startDate = new Date(`${date_from}T00:00:00`);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date.",
          });
        }

        dateFilter.$gte = startDate;
      }

      if (date_to) {
        const endDate = new Date(`${date_to}T23:59:59.999`);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date.",
          });
        }

        dateFilter.$lte = endDate;
      }

      if (
        date_from &&
        date_to &&
        new Date(`${date_from}T00:00:00`) >
          new Date(`${date_to}T23:59:59.999`)
      ) {
        return res.status(400).json({
          success: false,
          message: "From date cannot be later than To date.",
        });
      }

      studentMatch.createdAt = dateFilter;
    }

    if (course_id || batch_id) {
      const admissionMatch = {};

      if (course_id) {
        if (!mongoose.Types.ObjectId.isValid(course_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid course ID.",
          });
        }

        admissionMatch.course_id = new mongoose.Types.ObjectId(course_id);
      }

      if (batch_id) {
        if (!mongoose.Types.ObjectId.isValid(batch_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid batch ID.",
          });
        }

        admissionMatch.batch_id = new mongoose.Types.ObjectId(batch_id);
      }

      const matchingStudentIds = await StudentAdmission.distinct(
        "student_id",
        admissionMatch
      );

      if (!matchingStudentIds.length) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              totalStudents: 0,
              activeStudents: 0,
              inactiveStudents: 0,
              newStudents: 0,
            },
            students: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      studentMatch._id = { $in: matchingStudentIds };
    }

    const search = String(q || "").trim();

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      studentMatch.$or = [
        { firstName: regex },
        { surname: regex },
        { rollNo: regex },
        { email: regex },
        { mobile: regex },
        { fatherName: regex },
      ];
    }

    const [
      totalStudents,
      statusCounts,
      students,
    ] = await Promise.all([
      Student.countDocuments(studentMatch),

      Student.aggregate([
        { $match: studentMatch },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Student.find(studentMatch)
        .select(
          "_id rollNo firstName surname fatherName gender mobile email profileImage signature status createdAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const activeStudents =
      statusCounts.find((item) => item._id === "active")?.count || 0;

    const inactiveStudents =
      statusCounts.find((item) => item._id === "inactive")?.count || 0;

    const studentIds = students.map((student) => student._id);

    const admissions = studentIds.length
      ? await StudentAdmission.find({
          student_id: { $in: studentIds },
        })
          .select(
            "student_id course_id batch_id admission_date status final_amount paid_amount"
          )
          .populate({
            path: "course_id",
            select: "courseTitle courseType",
          })
          .populate({
            path: "batch_id",
            select: "batch_name status",
          })
          .sort({ admission_date: -1, _id: -1 })
          .lean()
      : [];

    const latestAdmissionMap = new Map();

    admissions.forEach((admission) => {
      const studentId = String(admission.student_id);

      if (!latestAdmissionMap.has(studentId)) {
        latestAdmissionMap.set(studentId, admission);
      }
    });

    const reportStudents = students.map((student) => {
      const admission = latestAdmissionMap.get(String(student._id));

      return {
        _id: student._id,
        rollNo: student.rollNo || "",
        studentName: [student.firstName, student.surname]
          .filter(Boolean)
          .join(" ")
          .trim(),
        fatherName: student.fatherName || "",
        profileImage: student.profileImage || "",
        signature: student.signature || "",
        gender: student.gender || "",
        mobile: student.mobile || "",
        email: student.email || "",
        course:
          admission?.course_id?.courseTitle ||
          student.course ||
          "",
        batch:
          admission?.batch_id?.batch_name ||
          student.batch ||
          "",
        admissionDate: admission?.admission_date || null,
        admissionStatus: admission?.status || "",
        status: student.status || "active",
        createdAt: student.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudents,
          activeStudents,
          inactiveStudents,
          newStudents: date_from || date_to ? totalStudents : 0,
        },
        students: reportStudents,
        pagination: {
          page,
          limit,
          total: totalStudents,
          totalPages: Math.ceil(totalStudents / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get student report error:", error);
    next(error);
  }
};