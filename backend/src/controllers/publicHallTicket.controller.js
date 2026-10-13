
import mongoose from "mongoose";
import HallTicket from "../models/HallTicket.js";

export const verifyHallTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hall ticket verification link.",
      });
    }

    const ticket = await HallTicket.findById(id)
      .populate("student_id", "firstName middleName surname rollNo")
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks marksPerQuestion")
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Hall ticket not found. This ticket could not be verified.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hallTicketNo: ticket.hallTicketNo,
        status: ticket.status,
        studentName: [
          ticket.student_id?.firstName,
          ticket.student_id?.middleName,
          ticket.student_id?.surname,
        ]
          .filter(Boolean)
          .join(" "),
        rollNo: ticket.student_id?.rollNo || "",
        course: ticket.course_id?.courseTitle || "",
        examDate: ticket.examDate,
        reportingTime: ticket.reportingTime,
        startTime: ticket.startTime,
        endTime: ticket.endTime,
        totalQuestions: ticket.exam_id?.totalQuestions ?? null,
        totalMarks: ticket.exam_id?.totalMarks ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};
