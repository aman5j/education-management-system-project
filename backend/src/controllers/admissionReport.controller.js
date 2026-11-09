import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

const DEFAULT_LIMIT = 10;
const ALLOWED_LIMITS = [10, 25, 50];

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

const getDateFilter = (date_from, date_to) => {
  const filter = {};

  if (date_from) {
    const startDate = new Date(`${date_from}T00:00:00`);

    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid from date.");
    }

    filter.$gte = startDate;
  }

  if (date_to) {
    const endDate = new Date(`${date_to}T23:59:59.999`);

    if (Number.isNaN(endDate.getTime())) {
      throw new Error("Invalid to date.");
    }

    filter.$lte = endDate;
  }

  if (
    date_from &&
    date_to &&
    new Date(`${date_from}T00:00:00`) >
      new Date(`${date_to}T23:59:59.999`)
  ) {
    throw new Error("From date cannot be later than To date.");
  }

  return filter;
};

export const getAdmissionReportFilters = async (req, res, next) => {
  try {
    const [courses, batches] = await Promise.all([
      Course.find({})
        .select("_id courseTitle courseType status")
        .sort({ courseTitle: 1 })
        .lean(),

      Batch.find({})
        .select("_id batch_name course_id status")
        .populate({
          path: "course_id",
          select: "_id courseTitle",
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

export const getAdmissionReport = async (req, res, next) => {
  try {
    const {
      date_from,
      date_to,
      course_id,
      batch_id,
      status,
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);
    const match = {};

    if (status) {
      const allowedStatuses = ["Active", "Completed", "Dropped"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admission status.",
        });
      }

      match.status = status;
    }

    if (date_from || date_to) {
      try {
        match.admission_date = getDateFilter(date_from, date_to);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    if (course_id) {
      if (!mongoose.Types.ObjectId.isValid(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      match.course_id = new mongoose.Types.ObjectId(course_id);
    }

    if (batch_id) {
      if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      match.batch_id = new mongoose.Types.ObjectId(batch_id);
    }

    const [
      totalAdmissions,
      summaryRows,
      admissions,
    ] = await Promise.all([
      StudentAdmission.countDocuments(match),

      StudentAdmission.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            activeAdmissions: {
              $sum: {
                $cond: [{ $eq: ["$status", "Active"] }, 1, 0],
              },
            },
            completedAdmissions: {
              $sum: {
                $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
              },
            },
            droppedAdmissions: {
              $sum: {
                $cond: [{ $eq: ["$status", "Dropped"] }, 1, 0],
              },
            },
            totalCourseFees: {
              $sum: { $ifNull: ["$course_fee", 0] },
            },
            totalFinalAmount: {
              $sum: { $ifNull: ["$final_amount", 0] },
            },
            totalAdmissionFees: {
              $sum: { $ifNull: ["$admission_fee", 0] },
            },
            totalPaidAmount: {
              $sum: { $ifNull: ["$paid_amount", 0] },
            },
            // !!!!! insertion start
            totalRemainingAmount: {
              $sum: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ["$final_amount", 0] },
                      { $ifNull: ["$paid_amount", 0] },
                    ],
                  },
                ],
              },
            },
            // !!!!! insertion end

          },
        },
      ]),

      StudentAdmission.find(match)
        .populate({
          path: "student_id",
          select:
            "rollNo firstName surname mobile email profileImage fatherName signature",
        })
        .populate({
          path: "course_id",
          select: "_id courseTitle courseType status",
        })
        .populate({
          path: "batch_id",
          select: "_id batch_name status course_id",
        })
        .sort({ admission_date: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totals = summaryRows[0] || {};

    const totalCourseFees = Number(totals.totalCourseFees || 0);
    const totalFinalAmount = Number(totals.totalFinalAmount || 0);
    const totalAdmissionFees = Number(totals.totalAdmissionFees || 0);
    const totalPaidAmount = Number(totals.totalPaidAmount || 0);

    // !!!!! insertion start
    const totalRemainingAmount = Number(
      totals.totalRemainingAmount || 0
    );
    // !!!!! insertion end

    // const totalRemainingAmount = Math.max(
    //   0,
    //   totalFinalAmount - totalPaidAmount
    // );

    const rows = admissions.map((admission) => {
      const student = admission.student_id || {};
      const course = admission.course_id || {};
      const batch = admission.batch_id || {};

      const finalAmount = Number(admission.final_amount || 0);
      const paidAmount = Number(admission.paid_amount || 0);

      return {
        _id: admission._id,
        student: {
          _id: student._id || null,
          rollNo: student.rollNo || "",
          name: [student.firstName, student.surname]
            .filter(Boolean)
            .join(" ")
            .trim(),
          fatherName: student.fatherName || "",
          profileImage: student.profileImage || "",
          signature: student.signature || "",
          mobile: student.mobile || "",
          email: student.email || "",
        },
        course: {
          _id: course._id || null,
          courseTitle: course.courseTitle || "",
          courseType: course.courseType || "",
        },
        batch: {
          _id: batch._id || null,
          batch_name: batch.batch_name || "",
        },
        courseFee: Number(admission.course_fee || 0),
        discountType: admission.discount_type || "",
        discountValue: Number(admission.discount_value || 0),
        gstAmount: Number(admission.gst_amount || 0),
        finalAmount,
        admissionFee: Number(admission.admission_fee || 0),
        paidAmount,
        remainingAmount: Math.max(0, finalAmount - paidAmount),
        admissionDate: admission.admission_date,
        referralSource: admission.referral_source || "",
        status: admission.status || "Active",
        createdAt: admission.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAdmissions,
          activeAdmissions: Number(totals.activeAdmissions || 0),
          completedAdmissions: Number(totals.completedAdmissions || 0),
          droppedAdmissions: Number(totals.droppedAdmissions || 0),
          totalCourseFees,
          totalFinalAmount,
          totalAdmissionFees,
          totalPaidAmount,
          totalRemainingAmount,
        },
        admissions: rows,
        pagination: {
          page,
          limit,
          total: totalAdmissions,
          totalPages: Math.ceil(totalAdmissions / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};