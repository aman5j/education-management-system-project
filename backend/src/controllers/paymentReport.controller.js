import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";

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

const getEmptyPaymentModeSummary = () => [
  { mode: "Cash", amount: 0 },
  { mode: "UPI", amount: 0 },
  { mode: "Card", amount: 0 },
  { mode: "Bank Transfer", amount: 0 },
];

export const getPaymentReportFilters = async (req, res) => {
  try {
    const [courses, batches, students] = await Promise.all([
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

      Student.find({})
        .select("_id rollNo firstName surname status")
        .sort({ firstName: 1, surname: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        courses,
        batches,
        students,
      },
    });
  } catch (error) {
    console.error("Get payment report filters error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load payment report filters.",
    });
  }
};

export const getPaymentReport = async (req, res) => {
  try {
    const {
      date_from = "",
      date_to = "",
      course_id = "",
      batch_id = "",
      status = "",
      payment_mode = "",
      student_id = "",
    } = req.query;

    const { page, limit } = getPagination(req.query);
    const match = {};

    // Payment status
    if (status) {
      const allowedStatuses = [
        "Verified",
        "Pending",
        "Failed",
        "Overdue",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      match.status = status;
    }

    // Payment mode
    if (payment_mode) {
      const allowedPaymentModes = [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
      ];

      if (!allowedPaymentModes.includes(payment_mode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment mode.",
        });
      }

      match.payment_mode = payment_mode;
    }

    // Student
    if (student_id) {
      if (!mongoose.Types.ObjectId.isValid(student_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      match.student_id = new mongoose.Types.ObjectId(student_id);
    }

    // Date range
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
      match.payment_date = {};

      if (date_from) {
        match.payment_date.$gte = new Date(
          `${date_from}T00:00:00`
        );
      }

      if (date_to) {
        match.payment_date.$lte = new Date(
          `${date_to}T23:59:59.999`
        );
      }
    }

    // Course and batch are related through StudentAdmission.
    if (course_id || batch_id) {
      const admissionMatch = {};

      if (course_id) {
        if (!mongoose.Types.ObjectId.isValid(course_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid course ID.",
          });
        }

        admissionMatch.course_id =
          new mongoose.Types.ObjectId(course_id);
      }

      if (batch_id) {
        if (!mongoose.Types.ObjectId.isValid(batch_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid batch ID.",
          });
        }

        admissionMatch.batch_id =
          new mongoose.Types.ObjectId(batch_id);
      }

      const admissions = await StudentAdmission.find(admissionMatch)
        .select("_id")
        .lean();

      const admissionIds = admissions.map(
        (admission) => admission._id
      );

      if (!admissionIds.length) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              totalStudents: 0,
              totalTransactions: 0,
              totalFeesCollected: 0,
              pendingPayments: 0,
              overduePayments: 0,
              failedPayments: 0,
            },
            paymentModeSummary: getEmptyPaymentModeSummary(),
            transactions: [],
            pagination: {
              page: 1,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      match.admission_id = {
        $in: admissionIds,
      };
    }

    // Load all filtered payments before calculating summaries.
    const payments = await Payment.find(match)
      .populate({
        path: "student_id",
        select: "rollNo firstName surname mobile email",
      })
      .populate({
        path: "admission_id",
        select:
          "course_id batch_id course_type course_fee discount_type discount_value gst_amount final_amount paid_amount admission_fee admission_date status",
        populate: [
          {
            path: "course_id",
            select: "courseTitle courseType",
          },
          {
            path: "batch_id",
            select: "batch_name status",
          },
        ],
      })
      .sort({
        payment_date: -1,
        createdAt: -1,
      })
      .lean();

    // Existing summary calculations — unchanged.
    const totalTransactions = payments.length;

    const totalCollected = payments
      .filter((payment) => payment.status === "Verified")
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

    const pendingAmount = payments
      .filter((payment) => payment.status === "Pending")
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

    const overdueAmount = payments
      .filter((payment) => payment.status === "Overdue")
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

    const failedAmount = payments
      .filter((payment) => payment.status === "Failed")
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

    const uniqueStudents = new Set(
      payments
        .map((payment) => payment.student_id?._id)
        .filter(Boolean)
        .map((id) => String(id))
    );

    const paymentModeSummary = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      "Bank Transfer": 0,
    };

    payments.forEach((payment) => {
      if (payment.status !== "Verified") {
        return;
      }

      const mode = payment.payment_mode;

      if (
        Object.prototype.hasOwnProperty.call(
          paymentModeSummary,
          mode
        )
      ) {
        paymentModeSummary[mode] += Number(
          payment.amount || 0
        );
      }
    });

    const transactions = payments.map((payment) => ({
      _id: payment._id,
      receipt_no: payment.receipt_no,
      payment_date: payment.payment_date,
      payment_mode: payment.payment_mode,
      amount: Number(payment.amount || 0),
      status: payment.status,
      notes: payment.notes || "",

      student: {
        _id: payment.student_id?._id,
        rollNo: payment.student_id?.rollNo || "",
        name: [
          payment.student_id?.firstName,
          payment.student_id?.surname,
        ]
          .filter(Boolean)
          .join(" "),
      },

      course:
        payment.admission_id?.course_id?.courseTitle ||
        payment.admission_id?.course_type ||
        "",

      batch:
        payment.admission_id?.batch_id?.batch_name ||
        "",
    }));

    const summary = {
      totalStudents: uniqueStudents.size,
      totalTransactions,
      totalFeesCollected: Number(totalCollected.toFixed(2)),
      pendingPayments: Number(pendingAmount.toFixed(2)),
      overduePayments: Number(overdueAmount.toFixed(2)),
      failedPayments: Number(failedAmount.toFixed(2)),
    };

    const formattedPaymentModeSummary = Object.entries(
      paymentModeSummary
    ).map(([mode, amount]) => ({
      mode,
      amount: Number(amount.toFixed(2)),
    }));

    // Pagination happens after the complete summary is calculated.
    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const startIndex = (safePage - 1) * limit;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        paymentModeSummary: formattedPaymentModeSummary,
        transactions: transactions.slice(
          startIndex,
          startIndex + limit
        ),
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get payment report error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate payment report.",
    });
  }
};