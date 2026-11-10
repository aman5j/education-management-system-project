import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";

const ALLOWED_STATUSES = ["Active", "Completed", "Dropped"];
const ALLOWED_LIMITS = [10, 25, 50];

const INITIAL_SUMMARY = {
  studentsWithPendingFees: 0,
  pendingAdmissions: 0,
  totalFinalFees: 0,
  totalPaid: 0,
  totalPending: 0,
  unpaidAdmissions: 0,
  partiallyPaidAdmissions: 0,
};

const isValidObjectId = (value) =>
  typeof value === "string" &&
  /^[a-fA-F0-9]{24}$/.test(value);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidDateInput = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const getPagination = (query) => {
  const pageValue = query.page;
  const limitValue = query.limit;

  if (
    pageValue !== undefined &&
    (!/^\d+$/.test(String(pageValue)) ||
      Number(pageValue) < 1)
  ) {
    return { error: "Page must be a positive integer." };
  }

  if (
    limitValue !== undefined &&
    !ALLOWED_LIMITS.includes(Number(limitValue))
  ) {
    return { error: "Limit must be 10, 25, or 50." };
  }

  return {
    page: pageValue === undefined ? 1 : Number(pageValue),
    limit: limitValue === undefined ? 10 : Number(limitValue),
  };
};

const getPendingFeeReportFilters = async (req, res, next) => {
  try {
    const [courses, batches, students] = await Promise.all([
      Course.find({})
        .select("_id courseTitle")
        .sort({ courseTitle: 1 })
        .lean(),

      Batch.find({})
        .populate("course_id", "_id courseTitle")
        .select("_id batch_name course_id status")
        .sort({ batch_name: 1 })
        .lean(),

      Student.find({})
        .select(
          "_id rollNo firstName surname fatherName mobile alternateMobile email"
        )
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
    next(error);
  }
};

const getPendingFeeReport = async (req, res, next) => {
  try {
    const {
      date_from,
      date_to,
      course_id,
      batch_id,
      student_id,
      student_search = "",
      status,
    } = req.query;

    const paginationInput = getPagination(req.query);

    if (paginationInput.error) {
      return res.status(400).json({
        success: false,
        message: paginationInput.error,
      });
    }

    const { page, limit } = paginationInput;

    // Validate IDs.
    if (course_id && !isValidObjectId(course_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    if (batch_id && !isValidObjectId(batch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    if (student_id && !isValidObjectId(student_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission status.",
      });
    }

    // Validate dates.
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

    // Validate student text search.
    const searchText =
      typeof student_search === "string"
        ? student_search.trim()
        : "";

    if (searchText.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Student search cannot exceed 100 characters.",
      });
    }

    const filter = {};

    if (course_id) {
      filter.course_id = new mongoose.Types.ObjectId(course_id);
    }

    if (batch_id) {
      filter.batch_id = new mongoose.Types.ObjectId(batch_id);
    }

    if (student_id) {
      filter.student_id = new mongoose.Types.ObjectId(student_id);
    }

    if (status) {
      filter.status = status;
    }

    if (date_from || date_to) {
      filter.admission_date = {};

      if (date_from) {
        filter.admission_date.$gte = new Date(
          `${date_from}T00:00:00.000Z`
        );
      }

      if (date_to) {
        filter.admission_date.$lte = new Date(
          `${date_to}T23:59:59.999Z`
        );
      }
    }

    /*
     * Student search:
     * Search the Student collection first, then use the matching
     * student IDs to filter StudentAdmission records.
     *
     * This supports name, roll number, father name, mobile,
     * alternate mobile, email, address and pincode.
     */
    if (searchText) {
      const searchRegex = new RegExp(
        escapeRegex(searchText),
        "i"
      );

      const matchingStudents = await Student.find({
        $or: [
          { firstName: searchRegex },
          { surname: searchRegex },
          { fatherName: searchRegex },
          { rollNo: searchRegex },
          { mobile: searchRegex },
          { alternateMobile: searchRegex },
          { email: searchRegex },
          { address: searchRegex },
          { pincode: searchRegex },
        ],
      })
        .select("_id")
        .lean();

      const matchingStudentIds = matchingStudents.map(
        (student) => student._id
      );

      // No matching student means no matching admissions.
      if (!matchingStudentIds.length) {
        return res.status(200).json({
          success: true,
          data: {
            summary: { ...INITIAL_SUMMARY },
            rows: [],
            pagination: {
              page: 1,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      const searchStudentFilter = {
        $in: matchingStudentIds,
      };

      if (filter.student_id) {
        // Keep exact student selection and text search combined.
        if (
          !matchingStudentIds.some(
            (id) => id.toString() === filter.student_id.toString()
          )
        ) {
          return res.status(200).json({
            success: true,
            data: {
              summary: { ...INITIAL_SUMMARY },
              rows: [],
              pagination: {
                page: 1,
                limit,
                total: 0,
                totalPages: 0,
              },
            },
          });
        }
      } else {
        filter.student_id = searchStudentFilter;
      }
    }

    const admissions = await StudentAdmission.find(filter)
      .populate(
        "student_id",
        "_id rollNo firstName surname fatherName mobile alternateMobile email address pincode"
      )
      .populate(
        "course_id",
        "_id courseTitle"
      )
      .populate(
        "batch_id",
        "_id batch_name"
      )
      .sort({
        admission_date: -1,
        _id: -1,
      })
      .lean();

    // Existing fee calculations — unchanged.
    const rows = admissions
      .map((admission) => {
        const finalAmount = Math.max(
          Number(admission.final_amount) || 0,
          0
        );

        const paidAmount = Math.max(
          Number(admission.paid_amount) || 0,
          0
        );

        const remainingAmount = Math.max(
          finalAmount - paidAmount,
          0
        );

        return {
          admission_id: admission._id,

          student: admission.student_id
            ? {
                _id: admission.student_id._id,
                rollNo: admission.student_id.rollNo,
                firstName: admission.student_id.firstName,
                surname: admission.student_id.surname,
                fatherName: admission.student_id.fatherName,
                mobile: admission.student_id.mobile,
                alternateMobile: admission.student_id.alternateMobile,
                email: admission.student_id.email,
                address: admission.student_id.address,
                pincode: admission.student_id.pincode,
                name: [
                  admission.student_id.firstName,
                  admission.student_id.surname,
                ]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,

          course: admission.course_id
            ? {
                _id: admission.course_id._id,
                courseTitle: admission.course_id.courseTitle,
              }
            : null,

          batch: admission.batch_id
            ? {
                _id: admission.batch_id._id,
                batch_name: admission.batch_id.batch_name,
              }
            : null,

          admission_date: admission.admission_date,

          course_fee: Number(admission.course_fee) || 0,

          discount_value: Number(admission.discount_value) || 0,

          gst_amount: Number(admission.gst_amount) || 0,

          admission_fee: Number(admission.admission_fee) || 0,

          final_amount: finalAmount,

          paid_amount: paidAmount,

          remaining_amount: remainingAmount,

          payment_status:
            paidAmount <= 0 ? "Unpaid" : "Partial",

          status: admission.status || "Active",
        };
      })
      .filter((row) => row.remaining_amount > 0);

    // Calculate complete summary before pagination.
    const uniqueStudents = new Set(
      rows
        .map((row) => row.student?._id?.toString())
        .filter(Boolean)
    );

    const summary = {
      studentsWithPendingFees: uniqueStudents.size,

      pendingAdmissions: rows.length,

      totalFinalFees: rows.reduce(
        (sum, row) => sum + Number(row.final_amount || 0),
        0
      ),

      totalPaid: rows.reduce(
        (sum, row) => sum + Number(row.paid_amount || 0),
        0
      ),

      totalPending: rows.reduce(
        (sum, row) => sum + Number(row.remaining_amount || 0),
        0
      ),

      unpaidAdmissions: rows.filter(
        (row) => row.payment_status === "Unpaid"
      ).length,

      partiallyPaidAdmissions: rows.filter(
        (row) => row.payment_status === "Partial"
      ).length,
    };

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0
      ? Math.min(page, totalPages)
      : 1;

    const startIndex = (safePage - 1) * limit;

    const paginatedRows = rows.slice(
      startIndex,
      startIndex + limit
    );

    return res.status(200).json({
      success: true,
      data: {
        summary,
        rows: paginatedRows,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  getPendingFeeReport,
  getPendingFeeReportFilters,
};