import mongoose from "mongoose";
import ExamAccessRequest from "../models/ExamAccessRequest.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (value) => mongoose.isValidObjectId(value);

export const getExamAccessRequests = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const filter = {};

    if (req.query.status) {
      if (!["Pending", "Approved", "Rejected"].includes(req.query.status)) {
        return fail(res, 400, "Invalid request status.");
      }

      filter.status = req.query.status;
    }

    if (req.query.exam_id) {
      if (!validId(req.query.exam_id)) {
        return fail(res, 400, "Invalid exam ID.");
      }

      filter.exam_id = req.query.exam_id;
    }

    if (req.query.course_id) {
      if (!validId(req.query.course_id)) {
        return fail(res, 400, "Invalid course ID.");
      }

      filter.course_id = req.query.course_id;
    }

    const [requests, total, pendingCount] = await Promise.all([
      ExamAccessRequest.find(filter)
        .populate("student_id", "firstName surname rollNo email mobile")
        .populate("course_id", "courseTitle")
        .populate("exam_id", "totalQuestions totalMarks")
        .populate("ticket_id", "hallTicketNo examDate startTime endTime")
        .populate("reviewedBy", "name email")
        .sort({ requestedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ExamAccessRequest.countDocuments(filter),

      ExamAccessRequest.countDocuments({ status: "Pending" }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        summary: {
          pending: pendingCount,
        },
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

export const reviewExamAccessRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason = "" } = req.body || {};

    if (!validId(requestId)) {
      return fail(res, 400, "Invalid exam access request ID.");
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return fail(res, 400, "Select Approved or Rejected.");
    }

    if (
      status === "Rejected" &&
      String(rejectionReason).trim().length < 5
    ) {
      return fail(
        res,
        400,
        "Please provide a rejection reason of at least 5 characters."
      );
    }

    const request = await ExamAccessRequest.findById(requestId);

    if (!request) {
      return fail(res, 404, "Exam access request not found.");
    }

    if (request.status !== "Pending") {
      return fail(
        res,
        409,
        `This request has already been ${request.status.toLowerCase()}.`
      );
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.rejectionReason =
      status === "Rejected" ? String(rejectionReason).trim() : "";

    await request.save();

    const populated = await ExamAccessRequest.findById(request._id)
      .populate("student_id", "firstName surname rollNo email")
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks")
      .populate("ticket_id", "hallTicketNo examDate startTime endTime")
      .populate("reviewedBy", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Exam access request ${status.toLowerCase()} successfully.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};