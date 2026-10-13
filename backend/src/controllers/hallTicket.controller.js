import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";
import HallTicket from "../models/HallTicket.js";

const validId = (value) => mongoose.isValidObjectId(value);

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const isTime = (value) =>
  typeof value === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
};

const makeTicketNo = (studentId) =>
  `HT-${Date.now().toString(36).toUpperCase()}-${String(studentId)
    .slice(-6)
    .toUpperCase()}`;


const populateTicket = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate("exam_id", "totalQuestions totalMarks marksPerQuestion")
    .populate(
      "student_id",
      [
        "firstName",
        "middleName",
        "surname",
        "rollNo",
        "mobile",
        "email",
        "course_id",
        "status",
        "photoUrl",
        "photoURL",
        "profileImage",
        "profilePhoto",
        "profile_image",
        "photo",
        "image",
        "imageUrl",
        "image_url",
        "avatar",
        "studentImage",
        "studentPhoto",
      ].join(" ")
    );


export const getHallTickets = async (req, res, next) => {
  try {
    const { course_id, exam_id, search = "", page = 1, limit = 10 } =
      req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const filter = {};

    if (course_id) {
      if (!validId(course_id)) return fail(res, 400, "Invalid course ID.");
      filter.course_id = course_id;
    }

    if (exam_id) {
      if (!validId(exam_id)) return fail(res, 400, "Invalid exam ID.");
      filter.exam_id = exam_id;
    }

    if (req.query.status) {
      if (!["Active", "Cancelled"].includes(req.query.status)) {
        return fail(res, 400, "Invalid hall ticket status.");
      }
      filter.status = req.query.status;
    }

    const [tickets, total] = await Promise.all([
      populateTicket(
        HallTicket.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
      ).lean(),
      HallTicket.countDocuments(filter),
    ]);

    const searchValue = String(search).trim().toLowerCase();
    const filteredTickets = searchValue
      ? tickets.filter((ticket) => {
          const student = ticket.student_id || {};
          const name = `${student.firstName || ""} ${
            student.surname || ""
          }`.toLowerCase();

          return (
            name.includes(searchValue) ||
            String(student.rollNo || "")
              .toLowerCase()
              .includes(searchValue) ||
            String(ticket.hallTicketNo || "")
              .toLowerCase()
              .includes(searchValue)
          );
        })
      : tickets;

    return res.json({
      success: true,
      data: {
        hallTickets: filteredTickets,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: searchValue ? filteredTickets.length : total,
          totalPages: Math.ceil(
            (searchValue ? filteredTickets.length : total) / limitNumber
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const generateHallTickets = async (req, res, next) => {
  try {
    const {
      course_id,
      exam_id,
      examDate: examDateInput,
      startTime,
      endTime,
      reportingTime,
      studentIds,
    } = req.body;

    if (!validId(course_id)) {
      return fail(res, 400, "Please select a valid course.");
    }

    if (!validId(exam_id)) {
      return fail(res, 400, "Please select an exam.");
    }

    const examDate = parseDate(examDateInput);

    if (!examDate) {
      return fail(res, 400, "Please select a valid exam date.");
    }

    if (!isTime(startTime) || !isTime(endTime) || !isTime(reportingTime)) {
      return fail(res, 400, "Please provide valid exam and reporting times.");
    }

    if (startTime >= endTime) {
      return fail(res, 400, "End time must be later than start time.");
    }

    if (reportingTime > startTime) {
      return fail(
        res,
        400,
        "Reporting time must be at or before the exam start time."
      );
    }

    if (
      !Array.isArray(studentIds) ||
      studentIds.length === 0 ||
      studentIds.length > 1000
    ) {
      return fail(res, 400, "Select at least one eligible student.");
    }

    if (studentIds.some((id) => !validId(id))) {
      return fail(res, 400, "A selected student ID is invalid.");
    }

    const uniqueStudentIds = [...new Set(studentIds.map(String))];

    if (uniqueStudentIds.length !== studentIds.length) {
      return fail(res, 400, "Duplicate student selections are not allowed.");
    }

    const [course, exam] = await Promise.all([
      Course.findById(course_id).select("_id courseTitle"),
      Exam.findById(exam_id).select("_id course_id totalQuestions totalMarks"),
    ]);

    if (!course) return fail(res, 404, "Course not found.");
    if (!exam) return fail(res, 404, "Exam not found.");

    if (String(exam.course_id) !== String(course_id)) {
      return fail(res, 400, "The selected exam does not belong to this course.");
    }

    const students = await Student.find({
      _id: { $in: uniqueStudentIds },
      course_id,
      status: "active",
    })
      .select("_id rollNo firstName surname")
      .lean();

    if (students.length !== uniqueStudentIds.length) {
      return fail(
        res,
        400,
        "One or more selected students are inactive or do not belong to this course."
      );
    }

    const existingTickets = await HallTicket.find({
      exam_id,
      student_id: { $in: uniqueStudentIds },
    })
      .select("student_id")
      .lean();

    const existingIds = new Set(
      existingTickets.map((ticket) => String(ticket.student_id))
    );

    const studentsToCreate = students.filter(
      (student) => !existingIds.has(String(student._id))
    );

    if (studentsToCreate.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Hall tickets already exist for all selected students.",
        duplicateCount: existingTickets.length,
      });
    }

    const documents = studentsToCreate.map((student) => ({
      exam_id,
      course_id,
      student_id: student._id,
      hallTicketNo: makeTicketNo(student._id),
      examDate,
      startTime,
      endTime,
      reportingTime,
      status: "Active",
    }));

    const created = await HallTicket.insertMany(documents, {
      ordered: false,
    });

    return res.status(201).json({
      success: true,
      message: `Generated ${created.length} hall ticket(s).`,
      generatedCount: created.length,
      duplicateCount: existingTickets.length,
      data: created,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "A duplicate hall ticket was detected. Refresh and check existing tickets."
      );
    }

    next(error);
  }
};

export const cancelHallTicket = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid hall ticket ID.");
    }

    const ticket = await HallTicket.findByIdAndUpdate(
      req.params.id,
      { status: "Cancelled" },
      { new: true, runValidators: true }
    );

    if (!ticket) return fail(res, 404, "Hall ticket not found.");

    return res.json({
      success: true,
      message: "Hall ticket cancelled successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};