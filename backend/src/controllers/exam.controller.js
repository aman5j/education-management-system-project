
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Subject from "../models/Subject.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const sendError = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const allowedStatuses = ["Scheduled", "Completed", "Cancelled"];
const allowedTypes = ["Theory", "Practical", "Oral", "Online"];

const editableFields = [
  "examName",
  "course_id",
  "batch_id",
  "subject_id",
  "examType",
  "examDate",
  "startTime",
  "endTime",
  "durationMinutes",
  "totalMarks",
  "passingMarks",
  "room",
  "instructions",
  "status",
];

const populateExam = (query) =>
  query
    .populate("course_id", "courseTitle courseType")
    .populate("batch_id", "batch_name status")
    .populate("subject_id", "subjectName subjectCode status");

const validateRelationships = async (data) => {
  const { course_id, batch_id, subject_id } = data;

  if (!isValidId(course_id)) {
    return { status: 400, message: "Please select a valid course." };
  }

  if (!isValidId(batch_id)) {
    return { status: 400, message: "Please select a valid batch." };
  }

  if (!isValidId(subject_id)) {
    return { status: 400, message: "Please select a valid subject." };
  }

  const [course, batch, subject] = await Promise.all([
    Course.findById(course_id).select("_id"),
    Batch.findById(batch_id).select("course_id"),
    Subject.findById(subject_id).select("course_id status"),
  ]);

  if (!course) {
    return { status: 404, message: "Selected course was not found." };
  }

  if (!batch) {
    return { status: 404, message: "Selected batch was not found." };
  }

  if (!subject) {
    return { status: 404, message: "Selected subject was not found." };
  }

  if (String(batch.course_id) !== String(course_id)) {
    return {
      status: 400,
      message: "The selected batch does not belong to this course.",
    };
  }

  if (String(subject.course_id) !== String(course_id)) {
    return {
      status: 400,
      message: "The selected subject does not belong to this course.",
    };
  }

  if (subject.status !== "Active") {
    return {
      status: 400,
      message: "An inactive subject cannot be scheduled for an exam.",
    };
  }

  return null;
};

const normalizeInput = (body) => {
  const data = {};

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  if (typeof data.examName === "string") {
    data.examName = data.examName.trim();
  }

  if (typeof data.room === "string") {
    data.room = data.room.trim();
  }

  if (typeof data.instructions === "string") {
    data.instructions = data.instructions.trim();
  }

  for (const field of [
    "durationMinutes",
    "totalMarks",
    "passingMarks",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(data, field) &&
      data[field] !== "" &&
      data[field] !== null
    ) {
      data[field] = Number(data[field]);
    }
  }

  if (data.examDate) {
    const value = String(data.examDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { error: "Exam date must use YYYY-MM-DD format." };
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      return { error: "Please provide a valid exam date." };
    }

    data.examDate = parsed;
  }

  return { data };
};

const validatePayload = (data, partial = false) => {
  const required = [
    "examName",
    "course_id",
    "batch_id",
    "subject_id",
    "examType",
    "examDate",
    "startTime",
    "endTime",
    "durationMinutes",
    "totalMarks",
    "passingMarks",
  ];

  if (!partial) {
    const missing = required.find(
      (field) =>
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
    );

    if (missing) {
      return `${missing} is required.`;
    }
  }

  if (
    data.examName !== undefined &&
    (typeof data.examName !== "string" ||
      data.examName.trim().length < 2 ||
      data.examName.trim().length > 150)
  ) {
    return "Exam name must contain between 2 and 150 characters.";
  }

  if (
    data.examType !== undefined &&
    !allowedTypes.includes(data.examType)
  ) {
    return "Invalid exam type.";
  }

  if (
    data.status !== undefined &&
    !allowedStatuses.includes(data.status)
  ) {
    return "Invalid exam status.";
  }

  for (const field of ["startTime", "endTime"]) {
    if (
      data[field] !== undefined &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(data[field])
    ) {
      return `${field} must use HH:mm format.`;
    }
  }

  if (
    data.startTime &&
    data.endTime &&
    data.startTime >= data.endTime
  ) {
    return "End time must be later than start time.";
  }

  for (const field of [
    "durationMinutes",
    "totalMarks",
    "passingMarks",
  ]) {
    if (
      data[field] !== undefined &&
      (!Number.isFinite(data[field]) ||
        !Number.isInteger(data[field]))
    ) {
      return `${field} must be a valid whole number.`;
    }
  }

  if (
    data.durationMinutes !== undefined &&
    (data.durationMinutes < 1 || data.durationMinutes > 1440)
  ) {
    return "Duration must be between 1 and 1440 minutes.";
  }

  if (data.totalMarks !== undefined && data.totalMarks < 1) {
    return "Total marks must be greater than zero.";
  }

  if (data.passingMarks !== undefined && data.passingMarks < 0) {
    return "Passing marks cannot be negative.";
  }

  if (
    data.totalMarks !== undefined &&
    data.passingMarks !== undefined &&
    data.passingMarks > data.totalMarks
  ) {
    return "Passing marks cannot exceed total marks.";
  }

  return null;
};

// GET /api/exams
export const getExams = async (req, res, next) => {
  try {
    const {
      search = "",
      course_id,
      batch_id,
      subject_id,
      status,
      from,
      to,
      page = 1,
      limit = 10,
      sortOrder = "asc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const filter = {};

    for (const [field, value] of Object.entries({
      course_id,
      batch_id,
      subject_id,
    })) {
      if (value) {
        if (!isValidId(value)) {
          return sendError(res, 400, `Invalid ${field}.`, "INVALID_ID");
        }
        filter[field] = value;
      }
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return sendError(res, 400, "Invalid exam status.");
      }
      filter.status = status;
    }

    if (from || to) {
      filter.examDate = {};

      if (from) {
        const start = new Date(`${from}T00:00:00.000Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
          Number.isNaN(start.getTime()) ||
          start.toISOString().slice(0, 10) !== from
        ) {
          return sendError(res, 400, "Invalid from date.");
        }
        filter.examDate.$gte = start;
      }

      if (to) {
        const end = new Date(`${to}T23:59:59.999Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
          Number.isNaN(end.getTime()) ||
          end.toISOString().slice(0, 10) !== to
        ) {
          return sendError(res, 400, "Invalid to date.");
        }
        filter.examDate.$lte = end;
      }

      if (from && to && from > to) {
        return sendError(res, 400, "'from' date cannot be after 'to' date.");
      }
    }

    if (search.trim()) {
      filter.examName = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const [exams, total] = await Promise.all([
      populateExam(
        Exam.find(filter)
          .sort({ examDate: sortDirection, startTime: sortDirection })
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
      ).lean(),
      Exam.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        exams,
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

// GET /api/exams/:id
export const getExamById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.", "INVALID_EXAM_ID");
    }

    const exam = await populateExam(Exam.findById(req.params.id));

    if (!exam) {
      return sendError(res, 404, "Exam not found.", "EXAM_NOT_FOUND");
    }

    return res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// POST /api/exams
export const createExam = async (req, res, next) => {
  try {
    const normalized = normalizeInput(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const data = normalized.data;
    const validationError = validatePayload(data);

    if (validationError) {
      return sendError(res, 400, validationError, "VALIDATION_ERROR");
    }

    const relationshipError = await validateRelationships(data);

    if (relationshipError) {
      return sendError(
        res,
        relationshipError.status,
        relationshipError.message,
        "INVALID_RELATIONSHIP"
      );
    }

    const exam = await Exam.create(data);
    const populated = await populateExam(Exam.findById(exam._id));

    return res.status(201).json({
      success: true,
      message: "Exam scheduled successfully.",
      data: populated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return sendError(res, 400, error.message, "VALIDATION_ERROR");
    }
    next(error);
  }
};

// PATCH /api/exams/:id
export const updateExam = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.", "INVALID_EXAM_ID");
    }

    const existing = await Exam.findById(req.params.id);

    if (!existing) {
      return sendError(res, 404, "Exam not found.", "EXAM_NOT_FOUND");
    }

    const normalized = normalizeInput(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const updates = normalized.data;

    if (!Object.keys(updates).length) {
      return sendError(res, 400, "No supported fields were provided.");
    }

    const merged = { ...existing.toObject(), ...updates };
    const validationError = validatePayload(merged, true);

    if (validationError) {
      return sendError(res, 400, validationError, "VALIDATION_ERROR");
    }

    const relationshipError = await validateRelationships(merged);

    if (relationshipError) {
      return sendError(
        res,
        relationshipError.status,
        relationshipError.message,
        "INVALID_RELATIONSHIP"
      );
    }

    Object.assign(existing, updates);

    const reviewSensitiveFields = [
        "examName",
        "course_id",
        "batch_id",
        "subject_id",
        "examType",
        "examDate",
        "startTime",
        "endTime",
        "durationMinutes",
        "totalMarks",
        "passingMarks",
        "room",
        "instructions",
        ];

        const scheduleChanged = reviewSensitiveFields.some((field) =>
        Object.prototype.hasOwnProperty.call(updates, field)
        );

        if (scheduleChanged) {
        existing.reviewStatus = "Pending";
        existing.reviewComment = "";
        existing.reviewedBy = null;
        existing.reviewedAt = null;
        }

    await existing.save();

    const populated = await populateExam(Exam.findById(existing._id));

    return res.status(200).json({
      success: true,
      message: "Exam schedule updated successfully.",
      data: populated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return sendError(res, 400, error.message, "VALIDATION_ERROR");
    }
    next(error);
  }
};

// DELETE /api/exams/:id
export const deleteExam = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.", "INVALID_EXAM_ID");
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return sendError(res, 404, "Exam not found.", "EXAM_NOT_FOUND");
    }

    await exam.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Exam schedule deleted successfully.",
      data: { id: exam._id },
    });
  } catch (error) {
    next(error);
  }
};
