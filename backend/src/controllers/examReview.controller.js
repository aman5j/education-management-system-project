
import mongoose from "mongoose";
import Exam from "../models/Exam.js";

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

// GET /api/exam-review
export const getExamReviewQueue = async (req, res, next) => {
  try {
    const {
      reviewStatus = "Pending",
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const allowedStatuses = ["Pending", "Approved", "Rejected"];

    if (!allowedStatuses.includes(reviewStatus)) {
      return sendError(res, 400, "Invalid review status.");
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = { reviewStatus };

    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.examName = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    const [exams, total] = await Promise.all([
      Exam.find(filter)
        .populate("course_id", "courseTitle")
        .populate("batch_id", "batch_name")
        .populate("subject_id", "subjectName subjectCode")
        .populate("reviewedBy", "name email")
        .sort({ examDate: 1, startTime: 1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),

      Exam.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        exams,
        pagination: {
          page: currentPage,
          limit: perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/exam-review/:id/decision
export const reviewExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, reviewComment = "" } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid exam ID.");
    }

    if (!["Approved", "Rejected"].includes(decision)) {
      return sendError(
        res,
        400,
        "Decision must be Approved or Rejected."
      );
    }

    if (typeof reviewComment !== "string") {
      return sendError(res, 400, "Review comment must be text.");
    }

    const comment = reviewComment.trim();

    if (comment.length > 1000) {
      return sendError(
        res,
        400,
        "Review comment cannot exceed 1000 characters."
      );
    }

    if (decision === "Rejected" && !comment) {
      return sendError(
        res,
        400,
        "A comment is required when rejecting an exam."
      );
    }

    const exam = await Exam.findById(id);

    if (!exam) {
      return sendError(res, 404, "Exam not found.");
    }

    if (exam.status !== "Scheduled") {
      return sendError(
        res,
        400,
        "Only scheduled exams can be reviewed."
      );
    }

    if (exam.reviewStatus !== "Pending") {
      return sendError(
        res,
        409,
        "This exam has already been reviewed. It must be returned to Pending Review before another decision."
      );
    }

    exam.reviewStatus = decision;
    exam.reviewComment = comment;
    exam.reviewedBy = req.user._id;
    exam.reviewedAt = new Date();

    await exam.save();

    const populatedExam = await Exam.findById(exam._id)
      .populate("course_id", "courseTitle")
      .populate("batch_id", "batch_name")
      .populate("subject_id", "subjectName subjectCode")
      .populate("reviewedBy", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      message:
        decision === "Approved"
          ? "Exam schedule approved successfully."
          : "Exam schedule rejected successfully.",
      data: populatedExam,
    });
  } catch (error) {
    next(error);
  }
};
