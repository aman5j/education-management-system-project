import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

const getDateFilter = (date_from, date_to) => {
  const filter = {};

  if (date_from) {
    const startDate = new Date(date_from);

    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid from date.");
    }

    startDate.setHours(0, 0, 0, 0);

    filter.$gte = startDate;
  }

  if (date_to) {
    const endDate = new Date(date_to);

    if (Number.isNaN(endDate.getTime())) {
      throw new Error("Invalid to date.");
    }

    endDate.setHours(23, 59, 59, 999);

    filter.$lte = endDate;
  }

  return filter;
};

export const getAdmissionReportFilters = async (
  req,
  res,
  next
) => {
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
      data: {
        courses,
        batches,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdmissionReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      date_from,
      date_to,
      course_id,
      batch_id,
      status,
    } = req.query;

    const match = {};

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (status) {
      const allowedStatuses = [
        "Active",
        "Completed",
        "Dropped",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admission status.",
        });
      }

      match.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Admission Date
    |--------------------------------------------------------------------------
    */

    if (date_from || date_to) {
      try {
        match.admission_date = getDateFilter(
          date_from,
          date_to
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Course
    |--------------------------------------------------------------------------
    */

    if (course_id) {
      if (!mongoose.Types.ObjectId.isValid(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      match.course_id = new mongoose.Types.ObjectId(
        course_id
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Batch
    |--------------------------------------------------------------------------
    */

    if (batch_id) {
      if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      match.batch_id = new mongoose.Types.ObjectId(
        batch_id
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Load Admissions
    |--------------------------------------------------------------------------
    */

    const admissions = await StudentAdmission.find(match)
      .populate({
        path: "student_id",
        select:
          "rollNo firstName surname mobile email",
      })
      .populate({
        path: "course_id",
        select:
          "_id courseTitle courseType status",
      })
      .populate({
        path: "batch_id",
        select:
          "_id batch_name status course_id",
      })
      .sort({
        admission_date: -1,
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    let totalCourseFees = 0;
    let totalFinalAmount = 0;
    let totalAdmissionFees = 0;
    let totalPaidAmount = 0;
    let totalRemainingAmount = 0;

    let activeAdmissions = 0;
    let completedAdmissions = 0;
    let droppedAdmissions = 0;

    admissions.forEach((admission) => {
      const courseFee = Number(
        admission.course_fee || 0
      );

      const finalAmount = Number(
        admission.final_amount || 0
      );

      const admissionFee = Number(
        admission.admission_fee || 0
      );

      const paidAmount = Number(
        admission.paid_amount || 0
      );

      const remainingAmount = Math.max(
        0,
        finalAmount - paidAmount
      );

      totalCourseFees += courseFee;
      totalFinalAmount += finalAmount;
      totalAdmissionFees += admissionFee;
      totalPaidAmount += paidAmount;
      totalRemainingAmount += remainingAmount;

      if (admission.status === "Active") {
        activeAdmissions += 1;
      }

      if (admission.status === "Completed") {
        completedAdmissions += 1;
      }

      if (admission.status === "Dropped") {
        droppedAdmissions += 1;
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Response Rows
    |--------------------------------------------------------------------------
    */

    const rows = admissions.map((admission) => {
      const student = admission.student_id || {};
      const course = admission.course_id || {};
      const batch = admission.batch_id || {};

      const finalAmount = Number(
        admission.final_amount || 0
      );

      const paidAmount = Number(
        admission.paid_amount || 0
      );

      return {
        _id: admission._id,

        student: {
          _id: student._id || null,
          rollNo: student.rollNo || "",
          name: [
            student.firstName,
            student.surname,
          ]
            .filter(Boolean)
            .join(" ")
            .trim(),
          mobile: student.mobile || "",
          email: student.email || "",
        },

        course: {
          _id: course._id || null,
          courseTitle:
            course.courseTitle || "",
          courseType:
            course.courseType || "",
        },

        batch: {
          _id: batch._id || null,
          batch_name:
            batch.batch_name || "",
        },

        courseFee: Number(
          admission.course_fee || 0
        ),

        discountType:
          admission.discount_type || "",

        discountValue: Number(
          admission.discount_value || 0
        ),

        gstAmount: Number(
          admission.gst_amount || 0
        ),

        finalAmount,

        admissionFee: Number(
          admission.admission_fee || 0
        ),

        paidAmount,

        remainingAmount: Math.max(
          0,
          finalAmount - paidAmount
        ),

        admissionDate:
          admission.admission_date,

        referralSource:
          admission.referral_source || "",

        status:
          admission.status || "Active",

        createdAt:
          admission.createdAt,
      };
    });

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalAdmissions:
            admissions.length,

          activeAdmissions,

          completedAdmissions,

          droppedAdmissions,

          totalCourseFees,

          totalFinalAmount,

          totalAdmissionFees,

          totalPaidAmount,

          totalRemainingAmount,
        },

        admissions: rows,
      },
    });
  } catch (error) {
    next(error);
  }
};