import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";
import HallTicket from "../models/HallTicket.js";
import StudentAdmission from "../models/StudentAdmission.js";
import ExamResult from "../models/ExamResult.js";

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

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const indiaDateString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const indiaDateTime = (date, time) =>
  new Date(`${date}T${time}:00+05:30`);

const makeTicketNo = (studentId) =>
  `HT-${Date.now().toString(36).toUpperCase()}-${String(studentId)
    .slice(-6)
    .toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const populateTicket = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate({
      path: "exam_id",
      select: "course_id totalQuestions totalMarks marksPerQuestion",
    })
    .populate({
      path: "student_id",
      select:
        "firstName middleName surname rollNo mobile email status profileImage signature",
    });

/**
 * GET /api/hall-tickets
 *
 * Supports:
 * page, limit, search, course_id, exam_id, status
 */
export const getHallTickets = async (req, res, next) => {
  try {
    const {
      course_id,
      exam_id,
      search = "",
      page = 1,
      limit = 10,
      status,
    } = req.query;

    const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number.parseInt(limit, 10) || 10, 1),
      100
    );

    const filter = {};

    if (course_id) {
      if (!validId(course_id)) {
        return fail(res, 400, "Invalid course ID.");
      }
      filter.course_id = course_id;
    }

    if (exam_id) {
      if (!validId(exam_id)) {
        return fail(res, 400, "Invalid exam ID.");
      }
      filter.exam_id = exam_id;
    }

    if (status) {
      if (!["Active", "Cancelled", "Completed"].includes(status)) {
        return fail(res, 400, "Invalid hall ticket status.");
      }
      filter.status = status;
    }

    const searchValue = String(search).trim();

    if (searchValue) {
      const regex = new RegExp(escapeRegex(searchValue), "i");

      const matchingStudents = await Student.find({
        $or: [
          { firstName: regex },
          { middleName: regex },
          { surname: regex },
          { rollNo: regex },
        ],
      })
        .select("_id")
        .lean();

      const matchingStudentIds = matchingStudents.map(
        (student) => student._id
      );

      filter.$or = [
        { hallTicketNo: regex },
        { student_id: { $in: matchingStudentIds } },
      ];
    }

    const [tickets, total] = await Promise.all([
      populateTicket(
        HallTicket.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
      ).lean(),
      HallTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        hallTickets: tickets,
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
 * GET /api/hall-tickets/eligible-students?course_id=COURSE_ID
 *
 * Only active students with an active admission for the course.
 */
export const getEligibleHallTicketStudents = async (req, res, next) => {
  try {
    const { course_id } = req.query;

    if (!validId(course_id)) {
      return fail(res, 400, "Please select a valid course.");
    }

    const courseExists = await Course.exists({ _id: course_id });

    if (!courseExists) {
      return fail(res, 404, "Course not found.");
    }

    const admissions = await StudentAdmission.find({
      course_id,
      status: "Active",
    })
      .select("student_id")
      .lean();

    const studentIds = [
      ...new Set(
        admissions.map((admission) => String(admission.student_id))
      ),
    ];

    if (!studentIds.length) {
      return res.json({
        success: true,
        data: { students: [] },
      });
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      status: "active",
    })
      .select("_id firstName middleName surname rollNo mobile email status")
      .sort({ firstName: 1, surname: 1 })
      .lean();

    return res.json({
      success: true,
      data: { students },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hall-tickets/generate
 */
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
    } = req.body || {};

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

    if (
      !isTime(startTime) ||
      !isTime(endTime) ||
      !isTime(reportingTime)
    ) {
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
      return fail(
        res,
        400,
        "The selected exam does not belong to this course."
      );
    }

    const students = await Student.find({
      _id: { $in: uniqueStudentIds },
      status: "active",
    })
      .select("_id rollNo firstName surname")
      .lean();

    if (students.length !== uniqueStudentIds.length) {
      return fail(
        res,
        400,
        "One or more selected students are inactive or could not be found."
      );
    }

    const activeAdmissions = await StudentAdmission.find({
      course_id,
      status: "Active",
      student_id: { $in: uniqueStudentIds },
    })
      .select("student_id")
      .lean();

    const eligibleStudentIds = new Set(
      activeAdmissions.map((admission) => String(admission.student_id))
    );

    const ineligibleStudents = uniqueStudentIds.filter(
      (studentId) => !eligibleStudentIds.has(studentId)
    );

    if (ineligibleStudents.length) {
      return fail(
        res,
        400,
        "Every selected student must have an active admission for the selected course."
      );
    }

    const existingTickets = await HallTicket.find({
      exam_id,
      student_id: { $in: uniqueStudentIds },
      status: "Active",
    })
      .select("student_id")
      .lean();

    const existingIds = new Set(
      existingTickets.map((ticket) => String(ticket.student_id))
    );

    const studentsToCreate = students.filter(
      (student) => !existingIds.has(String(student._id))
    );

    if (!studentsToCreate.length) {
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

/**
 * PATCH /api/hall-tickets/:id/cancel
 */
export const cancelHallTicket = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid hall ticket ID.");
    }

    const ticket = await HallTicket.findById(req.params.id);

    if (!ticket) {
      return fail(res, 404, "Hall ticket not found.");
    }

    if (ticket.status !== "Active") {
      return fail(
        res,
        409,
        `Only active hall tickets can be cancelled. Current status: ${ticket.status}.`
      );
    }

    ticket.status = "Cancelled";
    await ticket.save();

    return res.json({
      success: true,
      message: "Hall ticket cancelled successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/hall-tickets/:id/reschedule-missed
 *
 * Reissue only after the previous exam window has ended.
 * Existing submitted/in-progress exam attempts are protected.
 */
export const rescheduleMissedHallTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      examDate: examDateInput,
      startTime,
      endTime,
      reportingTime,
      reason,
    } = req.body || {};

    if (!validId(id)) {
      return fail(res, 400, "Invalid hall ticket ID.");
    }

    const examDate = parseDate(examDateInput);

    if (!examDate) {
      return fail(res, 400, "Please select a valid new exam date.");
    }

    if (
      !isTime(startTime) ||
      !isTime(endTime) ||
      !isTime(reportingTime)
    ) {
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

    const reissueReason = String(reason || "").trim();

    if (reissueReason.length < 5) {
      return fail(
        res,
        400,
        "Please provide a reason of at least 5 characters."
      );
    }

    const newDateString = examDateInput;
    const todayInIndia = indiaDateString();

    if (newDateString < todayInIndia) {
      return fail(
        res,
        400,
        "The new exam date cannot be in the past."
      );
    }

    const newExamStart = indiaDateTime(newDateString, startTime);

    if (newExamStart.getTime() <= Date.now()) {
      return fail(
        res,
        400,
        "The new exam start time must be in the future."
      );
    }

    const ticket = await HallTicket.findById(id);

    if (!ticket) {
      return fail(res, 404, "Hall ticket not found.");
    }

    if (ticket.status !== "Active") {
      return fail(
        res,
        409,
        "Only an active missed-exam hall ticket can be reissued."
      );
    }

    const result = await ExamResult.findOne({
      exam_id: ticket.exam_id,
      student_id: ticket.student_id,
    })
      .select("attemptStatus resultStatus")
      .lean();

    if (
      result?.attemptStatus === "Submitted" ||
      result?.resultStatus === "Published"
    ) {
      return fail(
        res,
        409,
        "This student has already completed the exam. A new hall ticket cannot be issued for the same exam."
      );
    }

    if (result?.attemptStatus === "InProgress") {
      return fail(
        res,
        409,
        "This student has an unfinished exam attempt. Review the existing attempt before scheduling another exam."
      );
    }

    const oldDate = ticket.examDate.toISOString().slice(0, 10);
    const oldEnd = indiaDateTime(oldDate, ticket.endTime);

    if (Date.now() < oldEnd.getTime()) {
      return fail(
        res,
        409,
        "The original exam window has not ended yet. This hall ticket cannot be rescheduled."
      );
    }

    // if (ticket.status !== "Active") {
    //   return fail(
    //     res,
    //     409,
    //     "Only an active missed-exam hall ticket can be reissued."
    //   );
    // }

    ticket.reissueHistory.push({
      hallTicketNo: ticket.hallTicketNo,
      examDate: ticket.examDate,
      startTime: ticket.startTime,
      endTime: ticket.endTime,
      reportingTime: ticket.reportingTime,
      status: ticket.status,
      reason: reissueReason,
      reissuedAt: new Date(),
    });

    ticket.examDate = examDate;
    ticket.startTime = startTime;
    ticket.endTime = endTime;
    ticket.reportingTime = reportingTime;
    ticket.hallTicketNo = makeTicketNo(ticket.student_id);
    ticket.status = "Active";

    await ticket.save();

    return res.json({
      success: true,
      message: "Missed exam hall ticket rescheduled successfully.",
      data: ticket,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "A duplicate hall ticket number or active exam assignment was detected."
      );
    }

    next(error);
  }
};