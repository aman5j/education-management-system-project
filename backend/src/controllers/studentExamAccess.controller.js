import mongoose from "mongoose";
import Student from "../models/Student.js";
import HallTicket from "../models/HallTicket.js";
import ExamAccessRequest from "../models/ExamAccessRequest.js";
import { getStudentExamFeeStatus } from "../utils/examFeeEligibility.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (value) => mongoose.isValidObjectId(value);

const IST_OFFSET = "+05:30";

const getScheduledTime = (dateValue, timeValue) => {
  if (!dateValue || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue || "")) {
    return null;
  }

  const datePart = new Date(dateValue).toISOString().slice(0, 10);
  const date = new Date(`${datePart}T${timeValue}:00${IST_OFFSET}`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getLinkedStudent = async (req) => {
  const studentId = req.user?.studentRecord;

  if (!studentId || !validId(String(studentId))) {
    return {
      error: {
        status: 409,
        message:
          "Your login is not linked to a student record. Contact your institute administrator.",
      },
    };
  }

  const student = await Student.findById(studentId)
    .select("_id firstName surname rollNo status")
    .lean();

  if (!student) {
    return {
      error: {
        status: 404,
        message: "Your linked student record could not be found.",
      },
    };
  }

  return { student };
};

const populateRequest = (query) =>
  query
    .populate("student_id", "firstName surname rollNo")
    .populate("course_id", "courseTitle")
    .populate("exam_id", "totalQuestions totalMarks")
    .populate("ticket_id", "hallTicketNo examDate startTime endTime");

export const getMyExamAccessRequest = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);

    if (linked.error) {
      return fail(res, linked.error.status, linked.error.message);
    }

    const { ticketId } = req.params;

    if (!validId(ticketId)) {
      return fail(res, 400, "Invalid hall ticket ID.");
    }

    const ticket = await HallTicket.findOne({
      _id: ticketId,
      student_id: linked.student._id,
      status: "Active",
    }).select("_id exam_id course_id");

    if (!ticket) {
      return fail(res, 404, "Active hall ticket not found.");
    }

    const request = await populateRequest(
      ExamAccessRequest.findOne({
        exam_id: ticket.exam_id,
        student_id: linked.student._id,
      })
    ).lean();

    return res.status(200).json({
      success: true,
      data: {
        status: request?.status || "NotRequested",
        request: request || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const requestMyExamAccess = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);

    if (linked.error) {
      return fail(res, linked.error.status, linked.error.message);
    }

    const { ticketId } = req.params;

    if (!validId(ticketId)) {
      return fail(res, 400, "Invalid hall ticket ID.");
    }

    const ticket = await HallTicket.findOne({
      _id: ticketId,
      student_id: linked.student._id,
      status: "Active",
    })
      .populate("exam_id", "_id totalQuestions totalMarks")
      .select("_id exam_id course_id examDate startTime endTime");

    if (!ticket || !ticket.exam_id?._id) {
      return fail(res, 404, "Active hall ticket or linked exam not found.");
    }

    if (linked.student.status !== "active") {
      return fail(res, 403, "Your student record is not active.");
    }

    const feeStatus = await getStudentExamFeeStatus(
    linked.student._id,
    ticket.course_id
    );

    if (!feeStatus.eligible) {
    return fail(res, 403, feeStatus.message);
    }

    const startAt = getScheduledTime(ticket.examDate, ticket.startTime);
    const endAt = getScheduledTime(ticket.examDate, ticket.endTime);
    const now = new Date();

    if (!startAt || !endAt || endAt <= startAt) {
      return fail(res, 409, "The exam schedule is invalid.");
    }

    if (now < startAt) {
    return fail(
        res,
        409,
        "The exam has not started yet. You can request access at the scheduled start time."
    );
    }

    if (now >= endAt) {
      return fail(res, 409, "The scheduled exam window has ended.");
    }

    let request = await ExamAccessRequest.findOne({
      exam_id: ticket.exam_id._id,
      student_id: linked.student._id,
    });

    if (request?.status === "Approved") {
      return res.status(200).json({
        success: true,
        message: "Your exam access has already been approved.",
        data: request,
      });
    }

    if (request?.status === "Pending") {
      return res.status(200).json({
        success: true,
        message: "Your exam access request is already pending.",
        data: request,
      });
    }

    if (request?.status === "Rejected") {
      request.ticket_id = ticket._id;
      request.course_id = ticket.course_id;
      request.status = "Pending";
      request.requestedAt = new Date();
      request.reviewedBy = null;
      request.reviewedAt = null;
      request.rejectionReason = "";
      await request.save();
    } else {
      try {
        request = await ExamAccessRequest.create({
          exam_id: ticket.exam_id._id,
          course_id: ticket.course_id,
          ticket_id: ticket._id,
          student_id: linked.student._id,
          status: "Pending",
          requestedAt: new Date(),
        });
      } catch (error) {
        // Handle two rapid requests without creating duplicate records.
        if (error.code !== 11000) throw error;

        request = await ExamAccessRequest.findOne({
          exam_id: ticket.exam_id._id,
          student_id: linked.student._id,
        });

        if (!request) throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Exam access request submitted successfully.",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};