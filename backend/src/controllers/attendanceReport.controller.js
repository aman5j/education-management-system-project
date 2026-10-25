
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";

const validStatuses = ["Present", "Absent", "Leave", "Late"];

const parseDate = (value) => {
  if (!value) return null;

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const getAttendanceReport = async (req, res, next) => {
  try {
    const {
      from,
      to,
      course_id,
      batch_id,
      student_id,
      status,
    } = req.query;

    const filter = {};

    if (from || to) {
      const start = from ? parseDate(from) : null;
      const end = to ? parseDate(to) : null;

      if ((from && !start) || (to && !end)) {
        return sendError(
          res,
          400,
          "Date filters must use YYYY-MM-DD format."
        );
      }

      if (start && end && start > end) {
        return sendError(
          res,
          400,
          "'From' date cannot be after 'To' date."
        );
      }

      filter.attendance_date = {};

      if (start) {
        filter.attendance_date.$gte = start;
      }

      if (end) {
        const exclusiveEnd = new Date(end);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        filter.attendance_date.$lt = exclusiveEnd;
      }
    }

    for (const [key, value] of Object.entries({
      course_id,
      batch_id,
      student_id,
    })) {
      if (value) {
        if (!mongoose.isValidObjectId(value)) {
          return sendError(res, 400, `Invalid ${key}.`);
        }

        filter[key] = new mongoose.Types.ObjectId(value);
      }
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid attendance status.");
      }

      filter.status = status;
    }

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const skip = (page - 1) * limit;

    const [
      totals,
      statusBreakdown,
      studentBreakdown,
      courseBreakdown,
      batchBreakdown,
      records,
      total,
    ] = await Promise.all([
      Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
              },
            },
            absent: {
              $sum: {
                $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
              },
            },
            leave: {
              $sum: {
                $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
              },
            },
            late: {
              $sum: {
                $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ]),

      Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$student_id",
            totalRecords: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
              },
            },
            absent: {
              $sum: {
                $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
              },
            },
            leave: {
              $sum: {
                $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
              },
            },
            late: {
              $sum: {
                $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
              },
            },
          },
        },
        {
          $addFields: {
            attendancePercentage: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$present",
                        { $max: ["$totalRecords", 1] },
                      ],
                    },
                    100,
                  ],
                },
                2,
              ],
            },
          },
        },
        { $sort: { attendancePercentage: 1 } },
        {
          $lookup: {
            from: "students",
            localField: "_id",
            foreignField: "_id",
            as: "student",
          },
        },
        {
          $unwind: {
            path: "$student",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            studentId: "$_id",
            rollNo: "$student.rollNo",
            firstName: "$student.firstName",
            surname: "$student.surname",
            profileImage: "$student.profileImage",
            totalRecords: 1,
            present: 1,
            absent: 1,
            leave: 1,
            late: 1,
            attendancePercentage: 1,
          },
        },
      ]),

      Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$course_id",
            totalRecords: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        {
          $unwind: {
            path: "$course",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            courseId: "$_id",
            courseTitle: "$course.courseTitle",
            totalRecords: 1,
            present: 1,
            attendancePercentage: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$present",
                        { $max: ["$totalRecords", 1] },
                      ],
                    },
                    100,
                  ],
                },
                2,
              ],
            },
          },
        },
        { $sort: { attendancePercentage: 1 } },
      ]),

      Attendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$batch_id",
            totalRecords: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$status", "Present"] }, 1, 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: "batches",
            localField: "_id",
            foreignField: "_id",
            as: "batch",
          },
        },
        {
          $unwind: {
            path: "$batch",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            batchId: "$_id",
            batchName: "$batch.batch_name",
            totalRecords: 1,
            present: 1,
            attendancePercentage: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$present",
                        { $max: ["$totalRecords", 1] },
                      ],
                    },
                    100,
                  ],
                },
                2,
              ],
            },
          },
        },
        { $sort: { attendancePercentage: 1 } },
      ]),

      Attendance.find(filter)
        .populate(
          "student_id",
          "rollNo firstName surname profileImage"
        )
        .populate("course_id", "courseTitle")
        .populate("batch_id", "batch_name")
        .populate("marked_by", "name email")
        .sort({ attendance_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Attendance.countDocuments(filter),
    ]);

    const summary = totals[0] || {
      totalRecords: 0,
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
    };

    summary.attendancePercentage =
      summary.totalRecords > 0
        ? Number(
            ((summary.present / summary.totalRecords) * 100).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        statusBreakdown,
        studentBreakdown,
        courseBreakdown,
        batchBreakdown,
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
