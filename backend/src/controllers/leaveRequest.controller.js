import mongoose from "mongoose";

import LeaveRequest from "../models/LeaveRequest.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Attendance from "../models/Attendance.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const isValidId = (id) => mongoose.isValidObjectId(id);

const normalizeDate = (value) => {
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

const getIndiaToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getDatesBetween = (fromDate, toDate) => {
  const dates = [];
  const current = new Date(fromDate);

  while (current <= toDate) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const populateLeave = (query) =>
  query
    .populate("student_id", "rollNo firstName surname mobile email")
    .populate("course_id", "courseTitle")
    .populate("batch_id", "batch_name")
    .populate("reviewer_id", "name email")
    .populate("admission_id", "admission_date status");

const getAuthenticatedStudent = async (req) => {
  if (req.user?.role !== "student" || !req.user.studentRecord) {
    return null;
  }

  return Student.findById(req.user.studentRecord)
    .select("_id status")
    .lean();
};

/**
 * GET /api/student-portal/leave/admissions
 *
 * Returns active admissions belonging to the logged-in student.
 */
export const getMyLeaveAdmissions = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const admissions = await StudentAdmission.find({
      student_id: student._id,
      status: "Active",
    })
      .populate("course_id", "courseTitle")
      .populate("batch_id", "batch_name")
      .sort({ admission_date: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: admissions.map((item) => ({
        admissionId: String(item._id),
        courseId: String(item.course_id?._id || ""),
        course: item.course_id?.courseTitle || "Course unavailable",
        batchId: String(item.batch_id?._id || ""),
        batch: item.batch_id?.batch_name || "Batch unavailable",
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student-portal/leave
 *
 * Student creates a leave request.
 */
export const createMyLeaveRequest = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    if (student.status !== "active") {
      return fail(res, 403, "Inactive students cannot apply for leave.");
    }

    const {
      admission_id,
      leave_type,
      from_date,
      to_date,
      reason,
    } = req.body;

    const fromDate = normalizeDate(from_date);
    const toDate = normalizeDate(to_date);

    if (!isValidId(admission_id)) {
      return fail(res, 400, "Please select a valid active admission.");
    }

    const allowedTypes = [
      "Sick Leave",
      "Casual Leave",
      "Emergency Leave",
      "Other",
    ];

    if (!allowedTypes.includes(leave_type)) {
      return fail(res, 400, "Please select a valid leave type.");
    }

    if (!fromDate || !toDate) {
      return fail(res, 400, "Valid from and to dates are required.");
    }

    if (fromDate > toDate) {
      return fail(res, 400, "From date cannot be after to date.");
    }

    if (from_date < getIndiaToday()) {
      return fail(res, 400, "Leave cannot be applied for past dates.");
    }

    // Keep individual requests within a reasonable range.
    const days = getDatesBetween(fromDate, toDate);

    if (days.length > 60) {
      return fail(res, 400, "A leave request cannot exceed 60 days.");
    }

    if (
      typeof reason !== "string" ||
      !reason.trim() ||
      reason.trim().length > 1000
    ) {
      return fail(res, 400, "Reason is required (maximum 1000 characters).");
    }

    const admission = await StudentAdmission.findOne({
      _id: admission_id,
      student_id: student._id,
      status: "Active",
    }).select("_id course_id batch_id");

    if (!admission) {
      return fail(res, 404, "The selected active admission was not found.");
    }

    // Prevent overlapping Pending or Approved leave requests
    // for the same student and admission.
    const overlapping = await LeaveRequest.findOne({
      student_id: student._id,
      admission_id: admission._id,
      status: { $in: ["Pending", "Approved"] },
      from_date: { $lte: toDate },
      to_date: { $gte: fromDate },
    }).select("_id");

    if (overlapping) {
      return fail(
        res,
        409,
        "You already have a pending or approved leave request overlapping these dates."
      );
    }

    const request = await LeaveRequest.create({
      student_id: student._id,
      admission_id: admission._id,
      course_id: admission.course_id,
      batch_id: admission.batch_id,
      leave_type,
      from_date: fromDate,
      to_date: toDate,
      reason: reason.trim(),
      status: "Pending",
    });

    const populated = await populateLeave(
      LeaveRequest.findById(request._id)
    );

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student-portal/leave
 *
 * Student sees only their own leave requests.
 */
export const getMyLeaveRequests = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const requests = await populateLeave(
      LeaveRequest.find({ student_id: student._id })
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/student-portal/leave/:id/cancel
 *
 * A student may cancel only their own Pending request.
 */
export const cancelMyLeaveRequest = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    if (!isValidId(req.params.id)) {
      return fail(res, 400, "Invalid leave request ID.");
    }

    const request = await LeaveRequest.findOne({
      _id: req.params.id,
      student_id: student._id,
    });

    if (!request) {
      return fail(res, 404, "Leave request not found.");
    }

    if (request.status !== "Pending") {
      return fail(res, 409, "Only pending requests can be cancelled.");
    }

    request.status = "Cancelled";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Leave request cancelled.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leave-requests
 *
 * Admin and authorized staff view requests.
 */
export const getLeaveRequests = async (req, res, next) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (status) {
      if (!["Pending", "Approved", "Rejected", "Cancelled"].includes(status)) {
        return fail(res, 400, "Invalid leave status.");
      }

      filter.status = status;
    }

    const fromDate = from ? normalizeDate(from) : null;
    const toDate = to ? normalizeDate(to) : null;

    if ((from && !fromDate) || (to && !toDate)) {
      return fail(res, 400, "Date filters must use YYYY-MM-DD format.");
    }

    if (fromDate || toDate) {
      filter.from_date = {};
      if (fromDate) filter.from_date.$gte = fromDate;
      if (toDate) filter.from_date.$lte = toDate;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [requests, total] = await Promise.all([
      populateLeave(LeaveRequest.find(filter))
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      LeaveRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/leave-requests/:id/review
 *
 * Admin or authorized staff approves/rejects a request.
 * Rejection remark is optional and is shown to the student.
 */
export const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { decision, admin_remark = "" } = req.body;

    if (!isValidId(req.params.id)) {
      return fail(res, 400, "Invalid leave request ID.");
    }

    if (!["Approved", "Rejected"].includes(decision)) {
      return fail(res, 400, "Decision must be Approved or Rejected.");
    }

    if (
      typeof admin_remark !== "string" ||
      admin_remark.trim().length > 1000
    ) {
      return fail(res, 400, "Remark must be text up to 1000 characters.");
    }

    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return fail(res, 404, "Leave request not found.");
    }

    if (request.status !== "Pending") {
      return fail(res, 409, "This leave request has already been reviewed.");
    }

    if (decision === "Approved") {
      const dates = getDatesBetween(
        request.from_date,
        request.to_date
      );

      // Check the complete date range before changing anything.
      // Present/Late attendance must never be silently overwritten.
      const existingRecords = await Attendance.find({
        student_id: request.student_id,
        attendance_date: { $in: dates },
      })
        .select("attendance_date status")
        .lean();

      const conflict = existingRecords.find((record) =>
        ["Present", "Late"].includes(record.status)
      );

      if (conflict) {
        return fail(
          res,
          409,
          `Cannot approve leave because attendance is already marked ${conflict.status} on ${conflict.attendance_date.toISOString().slice(0, 10)}. Resolve the attendance record first.`
        );
      }

      // Existing Absent records become Leave.
      // Missing dates get a new Leave record.
      for (const date of dates) {
        const existing = existingRecords.find(
          (record) =>
            record.attendance_date.toISOString().slice(0, 10) ===
            date.toISOString().slice(0, 10)
        );

        if (existing) {
          await Attendance.updateOne(
            {
              student_id: request.student_id,
              attendance_date: date,
              status: "Absent",
            },
            {
              $set: {
                status: "Leave",
                remarks: "Approved leave request",
                marked_by: req.user._id,
                course_id: request.course_id,
                batch_id: request.batch_id,
              },
            }
          );
        } else {
          try {
            await Attendance.create({
              student_id: request.student_id,
              course_id: request.course_id,
              batch_id: request.batch_id,
              attendance_date: date,
              status: "Leave",
              remarks: "Approved leave request",
              marked_by: req.user._id,
            });
          } catch (error) {
            // A concurrent attendance entry may have won the unique index.
            if (error.code !== 11000) throw error;

            const latest = await Attendance.findOne({
              student_id: request.student_id,
              attendance_date: date,
            }).select("status");

            if (latest && ["Present", "Late"].includes(latest.status)) {
              return fail(
                res,
                409,
                "Attendance was changed while leave was being approved. Refresh and review the attendance record."
              );
            }
          }
        }
      }
    }

    request.status = decision;
    request.reviewer_id = req.user._id;
    request.reviewed_at = new Date();

    // The remark is optional for rejection and cleared on approval.
    request.admin_remark =
      decision === "Rejected" ? admin_remark.trim() : "";

    await request.save();

    const populated = await populateLeave(
      LeaveRequest.findById(request._id)
    );

    return res.status(200).json({
      success: true,
      message:
        decision === "Approved"
          ? "Leave approved and attendance updated."
          : "Leave rejected successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};