import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";

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
        .select("_id rollNo firstName surname")
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
      status,
    } = req.query;

    const filter = {};

    if (
      course_id &&
      mongoose.Types.ObjectId.isValid(course_id)
    ) {
      filter.course_id = course_id;
    }

    if (
      batch_id &&
      mongoose.Types.ObjectId.isValid(batch_id)
    ) {
      filter.batch_id = batch_id;
    }

    if (
      student_id &&
      mongoose.Types.ObjectId.isValid(student_id)
    ) {
      filter.student_id = student_id;
    }

    if (
      status &&
      ["Active", "Completed", "Dropped"].includes(status)
    ) {
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

    const admissions = await StudentAdmission.find(filter)
      .populate(
        "student_id",
        "_id rollNo firstName surname email"
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
      })
      .lean();

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
                name: [
                  admission.student_id.firstName,
                  admission.student_id.surname,
                ]
                  .filter(Boolean)
                  .join(" "),
                email: admission.student_id.email,
              }
            : null,

          course: admission.course_id
            ? {
                _id: admission.course_id._id,
                courseTitle:
                  admission.course_id.courseTitle,
              }
            : null,

          batch: admission.batch_id
            ? {
                _id: admission.batch_id._id,
                batch_name:
                  admission.batch_id.batch_name,
              }
            : null,

          admission_date:
            admission.admission_date,

          course_fee:
            Number(admission.course_fee) || 0,

          discount_value:
            Number(admission.discount_value) || 0,

          gst_amount:
            Number(admission.gst_amount) || 0,

          admission_fee:
            Number(admission.admission_fee) || 0,

          final_amount: finalAmount,

          paid_amount: paidAmount,

          remaining_amount:
            remainingAmount,

          payment_status:
            paidAmount <= 0
              ? "Unpaid"
              : "Partial",

          status:
            admission.status || "Active",
        };
      })
      .filter(
        (row) => row.remaining_amount > 0
      );

    const uniqueStudents = new Set(
      rows
        .map((row) => row.student?._id?.toString())
        .filter(Boolean)
    );

    const summary = {
      studentsWithPendingFees:
        uniqueStudents.size,

      pendingAdmissions:
        rows.length,

      totalFinalFees:
        rows.reduce(
          (sum, row) =>
            sum + Number(row.final_amount || 0),
          0
        ),

      totalPaid:
        rows.reduce(
          (sum, row) =>
            sum + Number(row.paid_amount || 0),
          0
        ),

      totalPending:
        rows.reduce(
          (sum, row) =>
            sum + Number(
              row.remaining_amount || 0
            ),
          0
        ),

      unpaidAdmissions:
        rows.filter(
          (row) =>
            row.payment_status === "Unpaid"
        ).length,

      partiallyPaidAdmissions:
        rows.filter(
          (row) =>
            row.payment_status === "Partial"
        ).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        rows,
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