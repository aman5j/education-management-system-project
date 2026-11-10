
import mongoose from "mongoose";
import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";

const getPagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const limit = [10, 25, 50].includes(requestedLimit)
    ? requestedLimit
    : 10;

  return { page, limit };
};

const emptySummary = () => ({
  totalBatches: 0,
  totalStudents: 0,
  totalAdmissions: 0,
  totalCapacity: 0,
  totalOccupiedSeats: 0,
  totalAvailableSeats: 0,
  totalCourseFees: 0,
  totalPaidAmount: 0,
  totalRemainingAmount: 0,
  activeAdmissions: 0,
  completedAdmissions: 0,
  droppedAdmissions: 0,
});

export const getBatchReportFilters = async (req, res, next) => {
  try {
    const [batches, courses] = await Promise.all([
      Batch.find({})
        .populate({
          path: "course_id",
          select: "_id courseTitle courseType courseCategory",
        })
        .select("_id batch_name course_id max_seats available_seats status")
        .sort({ batch_name: 1 })
        .lean(),

      Course.find({})
        .select("_id courseTitle courseType courseCategory")
        .sort({ courseTitle: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { courses, batches },
    });
  } catch (error) {
    console.error("Batch report filters error:", error);
    next(error);
  }
};

export const getBatchReport = async (req, res, next) => {
  try {
    const {
      search = "",
      course_id = "",
      status = "",
    } = req.query;

    const { page, limit } = getPagination(req.query);
    const batchQuery = {};

    if (search.trim()) {
      batchQuery.batch_name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (course_id) {
      if (!mongoose.Types.ObjectId.isValid(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      batchQuery.course_id = new mongoose.Types.ObjectId(course_id);
    }

    if (status) {
      if (!["Upcoming", "Ongoing", "Closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch status.",
        });
      }

      batchQuery.status = status;
    }

    const batches = await Batch.find(batchQuery)
      .populate({
        path: "course_id",
        select: "_id courseTitle courseType courseCategory",
      })
      .select([
        "_id",
        "course_id",
        "batch_name",
        "max_seats",
        "available_seats",
        "status",
        "createdAt",
        "updatedAt",
      ].join(" "))
      .sort({ createdAt: -1, batch_name: 1 })
      .lean();

    if (!batches.length) {
      return res.status(200).json({
        success: true,
        data: {
          summary: emptySummary(),
          batches: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    const batchIds = batches.map((batch) => batch._id);

    const admissions = await StudentAdmission.find({
      batch_id: { $in: batchIds },
    })
      .populate({
        path: "student_id",
        select: "_id rollNo firstName surname mobile email status",
      })
      .populate({
        path: "course_id",
        select: "_id courseTitle courseType courseCategory",
      })
      .populate({
        path: "batch_id",
        select: "_id batch_name status",
      })
      .lean();

    const grouped = new Map();

    batches.forEach((batch) => {
      grouped.set(String(batch._id), {
        batch,
        studentIds: new Set(),
        totalAdmissions: 0,
        activeAdmissions: 0,
        completedAdmissions: 0,
        droppedAdmissions: 0,
        totalCourseFees: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      });
    });

    admissions.forEach((admission) => {
      const batchId = admission.batch_id?._id;
      if (!batchId) return;

      const report = grouped.get(String(batchId));
      if (!report) return;

      if (admission.student_id?._id) {
        report.studentIds.add(String(admission.student_id._id));
      }

      report.totalAdmissions += 1;

      if (admission.status === "Active") {
        report.activeAdmissions += 1;
      }

      if (admission.status === "Completed") {
        report.completedAdmissions += 1;
      }

      if (admission.status === "Dropped") {
        report.droppedAdmissions += 1;
      }

      const finalAmount = Number(admission.final_amount || 0);
      const paidAmount = Number(admission.paid_amount || 0);

      report.totalCourseFees += finalAmount;
      report.totalPaidAmount += paidAmount;
      report.totalRemainingAmount += Math.max(
        0,
        finalAmount - paidAmount
      );
    });

    const reportBatches = Array.from(grouped.values()).map((item) => {
      const batch = item.batch;
      const maxSeats = Number(batch.max_seats || 0);
      const availableSeats = Math.max(
        Number(batch.available_seats || 0),
        0
      );

      // Preserve the existing database-based seat occupancy calculation.
      const occupiedSeats = Math.max(maxSeats - availableSeats, 0);

      const occupancyPercentage = maxSeats > 0
        ? Number(((occupiedSeats / maxSeats) * 100).toFixed(2))
        : 0;

      return {
        batch,
        totalStudents: item.studentIds.size,
        totalAdmissions: item.totalAdmissions,
        activeAdmissions: item.activeAdmissions,
        completedAdmissions: item.completedAdmissions,
        droppedAdmissions: item.droppedAdmissions,
        maxSeats,
        occupiedSeats,
        availableSeats,
        occupancyPercentage,
        totalCourseFees: Number(item.totalCourseFees.toFixed(2)),
        totalPaidAmount: Number(item.totalPaidAmount.toFixed(2)),
        totalRemainingAmount: Number(item.totalRemainingAmount.toFixed(2)),
      };
    });

    const uniqueStudents = new Set();

    admissions.forEach((admission) => {
      if (admission.student_id?._id) {
        uniqueStudents.add(String(admission.student_id._id));
      }
    });

    const summary = reportBatches.reduce(
      (result, item) => {
        result.totalBatches += 1;
        result.totalAdmissions += item.totalAdmissions;
        result.activeAdmissions += item.activeAdmissions;
        result.completedAdmissions += item.completedAdmissions;
        result.droppedAdmissions += item.droppedAdmissions;
        result.totalCapacity += item.maxSeats;
        result.totalOccupiedSeats += item.occupiedSeats;
        result.totalAvailableSeats += item.availableSeats;
        result.totalCourseFees += item.totalCourseFees;
        result.totalPaidAmount += item.totalPaidAmount;
        result.totalRemainingAmount += item.totalRemainingAmount;
        return result;
      },
      {
        ...emptySummary(),
        totalStudents: uniqueStudents.size,
      }
    );

    summary.totalCourseFees = Number(summary.totalCourseFees.toFixed(2));
    summary.totalPaidAmount = Number(summary.totalPaidAmount.toFixed(2));
    summary.totalRemainingAmount = Number(
      summary.totalRemainingAmount.toFixed(2)
    );

    // Summary is calculated from every matching batch, not just this page.
    const total = reportBatches.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const startIndex = (safePage - 1) * limit;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        batches: reportBatches.slice(startIndex, startIndex + limit),
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Batch report error:", error);
    next(error);
  }
};
