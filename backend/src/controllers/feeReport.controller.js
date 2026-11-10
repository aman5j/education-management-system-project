import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

const getPagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit = [10, 25, 50].includes(requestedLimit)
    ? requestedLimit
    : 10;

  return { page, limit };
};

const isValidDateInput = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

export const getFeeReportFilters = async (req, res, next) => {
  try {
    const [courses, batches] = await Promise.all([
      Course.find({})
        .select("_id courseTitle courseType")
        .sort({ courseTitle: 1 })
        .lean(),

      Batch.find({})
        .populate({
          path: "course_id",
          select: "_id courseTitle courseType",
        })
        .select("_id batch_name course_id status")
        .sort({ batch_name: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        courses,
        batches,
      },
    });
  } catch (error) {
    console.error("Fee report filters error:", error);
    next(error);
  }
};

export const getFeeReport = async (req, res, next) => {
  try {
    const {
      date_from = "",
      date_to = "",
      course_id = "",
      batch_id = "",
      status = "",
    } = req.query;

    const { page, limit } = getPagination(req.query);
    const match = {};

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

    if (date_from && !isValidDateInput(date_from)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date.",
      });
    }

    if (date_to && !isValidDateInput(date_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date.",
      });
    }

    if (date_from && date_to && date_from > date_to) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    if (date_from || date_to) {
      match.admission_date = {};

      if (date_from) {
        match.admission_date.$gte = new Date(
          `${date_from}T00:00:00`
        );
      }

      if (date_to) {
        match.admission_date.$lte = new Date(
          `${date_to}T23:59:59.999`
        );
      }
    }

    const admissions = await StudentAdmission.find(match)
      .populate({
        path: "student_id",
        select: "_id rollNo firstName surname mobile email status",
      })
      .populate({
        path: "course_id",
        select: "_id courseTitle courseType",
      })
      .populate({
        path: "batch_id",
        select: "_id batch_name status",
      })
      .sort({
        admission_date: -1,
        createdAt: -1,
      })
      .lean();

    const students = new Set();

    let totalCourseFees = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalAdmissionFees = 0;
    let totalFinalFees = 0;
    let totalPaid = 0;
    let totalPending = 0;

    let fullyPaid = 0;
    let partiallyPaid = 0;
    let unpaid = 0;

    const rows = admissions.map((admission, index) => {
      const courseFee = Number(admission.course_fee || 0);
      const discountValue = Number(admission.discount_value || 0);
      const gstAmount = Number(admission.gst_amount || 0);
      const admissionFee = Number(admission.admission_fee || 0);
      const finalAmount = Number(admission.final_amount || 0);
      const paidAmount = Number(admission.paid_amount || 0);

      const remainingAmount = Math.max(
        0,
        finalAmount - paidAmount
      );

      let paymentStatus = "Unpaid";

      if (finalAmount > 0 && paidAmount >= finalAmount) {
        paymentStatus = "Paid";
        fullyPaid += 1;
      } else if (paidAmount > 0) {
        paymentStatus = "Partial";
        partiallyPaid += 1;
      } else {
        unpaid += 1;
      }

      if (admission.student_id?._id) {
        students.add(String(admission.student_id._id));
      }

      totalCourseFees += courseFee;
      totalDiscount += discountValue;
      totalGst += gstAmount;
      totalAdmissionFees += admissionFee;
      totalFinalFees += finalAmount;
      totalPaid += paidAmount;
      totalPending += remainingAmount;

      return {
        _id: admission._id,
        index: index + 1,

        student: {
          _id: admission.student_id?._id || null,
          rollNo: admission.student_id?.rollNo || "",
          name: [
            admission.student_id?.firstName,
            admission.student_id?.surname,
          ]
            .filter(Boolean)
            .join(" "),
        },

        course: {
          _id: admission.course_id?._id || null,
          title:
            admission.course_id?.courseTitle ||
            admission.course_type ||
            "",
          type:
            admission.course_id?.courseType ||
            admission.course_type ||
            "",
        },

        batch: {
          _id: admission.batch_id?._id || null,
          name: admission.batch_id?.batch_name || "",
        },

        admission_date: admission.admission_date,

        course_fee: Number(courseFee.toFixed(2)),
        discount: Number(discountValue.toFixed(2)),
        gst: Number(gstAmount.toFixed(2)),
        admission_fee: Number(admissionFee.toFixed(2)),
        final_amount: Number(finalAmount.toFixed(2)),
        paid_amount: Number(paidAmount.toFixed(2)),
        remaining_amount: Number(remainingAmount.toFixed(2)),

        payment_status: paymentStatus,
        admission_status: admission.status || "",
      };
    });

    // Summary always represents the complete filtered result.
    const summary = {
      totalStudents: students.size,
      totalAdmissions: admissions.length,

      totalCourseFees: Number(totalCourseFees.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      totalAdmissionFees: Number(totalAdmissionFees.toFixed(2)),
      totalFinalFees: Number(totalFinalFees.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),

      fullyPaid,
      partiallyPaid,
      unpaid,
    };

    // Paginate after preparing all rows and summary values.
    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const startIndex = (safePage - 1) * limit;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        fees: rows.slice(startIndex, startIndex + limit),
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Fee report error:", error);
    next(error);
  }
};