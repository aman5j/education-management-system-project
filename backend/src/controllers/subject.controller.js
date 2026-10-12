
import mongoose from "mongoose";
import Subject from "../models/Subject.js";

const sendError = (res, statusCode, message, errorCode) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.isValidObjectId(id);

const handleControllerError = (res, error) => {
  if (error?.code === 11000) {
    return sendError(
      res,
      409,
      "This subject code already exists. Please use a different code.",
      "DUPLICATE_SUBJECT_CODE"
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const message = Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");

    return sendError(
      res,
      400,
      message || "Subject validation failed.",
      "VALIDATION_ERROR"
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return sendError(
      res,
      400,
      "Invalid subject ID or field value.",
      "INVALID_ID"
    );
  }

  console.error("Subject controller error:", error);

  return sendError(
    res,
    500,
    "An unexpected error occurred while processing the subject request.",
    "INTERNAL_SERVER_ERROR"
  );
};

// Supports JSON arrays and JSON strings from multipart requests.
const parseSyllabus = (value) => {
  if (value === undefined || value === null || value === "") {
    return { data: [] };
  }

  let syllabus = value;

  if (typeof syllabus === "string") {
    try {
      syllabus = JSON.parse(syllabus);
    } catch {
      return { error: "Syllabus must contain valid JSON." };
    }
  }

  if (!Array.isArray(syllabus)) {
    return { error: "Syllabus must be an array of units." };
  }

  const normalized = [];

  for (const unit of syllabus) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit)) {
      return { error: "Each syllabus unit must be an object." };
    }

    const title =
      typeof unit.title === "string" ? unit.title.trim() : "";

    const description =
      typeof unit.description === "string"
        ? unit.description.trim()
        : "";

    const durationHours =
      unit.durationHours === undefined || unit.durationHours === ""
        ? 0
        : Number(unit.durationHours);

    if (!title || title.length > 150) {
      return {
        error: "Every syllabus unit needs a title of at most 150 characters.",
      };
    }

    if (
      !Number.isFinite(durationHours) ||
      durationHours < 0
    ) {
      return {
        error: `Invalid duration for syllabus unit "${title}".`,
      };
    }

    if (description.length > 2000) {
      return {
        error: `Description for "${title}" cannot exceed 2000 characters.`,
      };
    }

    const inputTopics = unit.topics ?? [];

    if (!Array.isArray(inputTopics)) {
      return {
        error: `Topics for "${title}" must be an array.`,
      };
    }

    const topics = [];

    for (const topic of inputTopics) {
      if (!topic || typeof topic !== "object" || Array.isArray(topic)) {
        return { error: `Invalid topic in syllabus unit "${title}".` };
      }

      const topicTitle =
        typeof topic.title === "string" ? topic.title.trim() : "";

      const topicDescription =
        typeof topic.description === "string"
          ? topic.description.trim()
          : "";

      if (!topicTitle || topicTitle.length > 150) {
        return {
          error: `Every topic in "${title}" needs a title of at most 150 characters.`,
        };
      }

      if (topicDescription.length > 2000) {
        return {
          error: `Topic description in "${title}" cannot exceed 2000 characters.`,
        };
      }

      topics.push({
        ...(topic._id ? { _id: topic._id } : {}),
        title: topicTitle,
        description: topicDescription,
      });
    }

    normalized.push({
      ...(unit._id ? { _id: unit._id } : {}),
      title,
      description,
      durationHours,
      topics,
    });
  }

  return { data: normalized };
};

const normalizeSubjectInput = (body) => {
  const input = {};

  for (const field of [
    "subjectName",
    "subjectCode",
    "description",
    "status",
  ]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      input[field] = body[field];
    }
  }

  // Syllabus is normalized separately in create/update.
  if (Object.prototype.hasOwnProperty.call(body, "syllabus")) {
    input.syllabus = body.syllabus;
  }

  // Legacy compatibility only. New subjects do not require course_id.
  if (Object.prototype.hasOwnProperty.call(body, "course_id")) {
    input.course_id = body.course_id;
  }

  return input;
};

const validateSubjectFields = (data, { partial = false } = {}) => {
  if (
    !partial &&
    (typeof data.subjectName !== "string" ||
      !data.subjectName.trim())
  ) {
    return {
      message: "Subject name is required.",
      code: "SUBJECT_NAME_REQUIRED",
    };
  }

  if (
    !partial &&
    (typeof data.subjectCode !== "string" ||
      !data.subjectCode.trim())
  ) {
    return {
      message: "Subject code is required.",
      code: "SUBJECT_CODE_REQUIRED",
    };
  }

  if (
    data.subjectName !== undefined &&
    (typeof data.subjectName !== "string" ||
      data.subjectName.trim().length < 2 ||
      data.subjectName.trim().length > 100)
  ) {
    return {
      message: "Subject name must contain 2 to 100 characters.",
      code: "INVALID_SUBJECT_NAME",
    };
  }

  if (
    data.subjectCode !== undefined &&
    (typeof data.subjectCode !== "string" ||
      data.subjectCode.trim().length < 2 ||
      data.subjectCode.trim().length > 30)
  ) {
    return {
      message: "Subject code must contain 2 to 30 characters.",
      code: "INVALID_SUBJECT_CODE",
    };
  }

  if (
    data.description !== undefined &&
    (typeof data.description !== "string" ||
      data.description.trim().length > 1000)
  ) {
    return {
      message: "Description must be a string of at most 1000 characters.",
      code: "INVALID_DESCRIPTION",
    };
  }

  if (
    data.status !== undefined &&
    !["Active", "Inactive"].includes(data.status)
  ) {
    return {
      message: "Status must be Active or Inactive.",
      code: "INVALID_STATUS",
    };
  }

  return null;
};

// =====================================================
// CREATE SUBJECT
// POST /api/subjects
// =====================================================
export const createSubject = async (req, res) => {
  try {
    const input = normalizeSubjectInput(req.body);

    const fieldError = validateSubjectFields(input);

    if (fieldError) {
      return sendError(
        res,
        400,
        fieldError.message,
        fieldError.code
      );
    }

    // Validate an optional legacy course_id only if supplied.
    // New subjects are independent and do not need this field.
    if (
      input.course_id !== undefined &&
      input.course_id !== null &&
      input.course_id !== ""
    ) {
      if (!isValidObjectId(String(input.course_id))) {
        return sendError(
          res,
          400,
          "Please provide a valid course ID.",
          "INVALID_COURSE_ID"
        );
      }
    } else {
      delete input.course_id;
    }

    const syllabusResult = parseSyllabus(input.syllabus);

    if (syllabusResult.error) {
      return sendError(
        res,
        400,
        syllabusResult.error,
        "INVALID_SYLLABUS"
      );
    }

    const subjectData = {
      subjectName: input.subjectName.trim(),
      subjectCode: input.subjectCode.trim().toUpperCase(),
      description: (input.description || "").trim(),
      status: input.status || "Active",
      syllabus: syllabusResult.data,
    };

    // Retain the legacy association only when an older client sends it.
    if (input.course_id) {
      subjectData.course_id = input.course_id;
    }

    const subject = await Subject.create(subjectData);

    return res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      data: subject,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// GET ALL SUBJECTS
// GET /api/subjects
// Supports search, optional legacy course filter, status,
// sorting and pagination.
// =====================================================
export const getSubjects = async (req, res) => {
  try {
    const {
      search = "",
      course_id,
      status,
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return sendError(
        res,
        400,
        "Page must be a positive integer.",
        "INVALID_PAGE"
      );
    }

    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return sendError(
        res,
        400,
        "Limit must be between 1 and 100.",
        "INVALID_LIMIT"
      );
    }

    const allowedSortFields = [
      "subjectName",
      "subjectCode",
      "status",
      "createdAt",
      "updatedAt",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return sendError(
        res,
        400,
        "Invalid sort field.",
        "INVALID_SORT_FIELD"
      );
    }

    if (!["asc", "desc"].includes(order)) {
      return sendError(
        res,
        400,
        "Order must be asc or desc.",
        "INVALID_SORT_ORDER"
      );
    }

    const filter = {};

    // This filter is for old records/clients only.
    if (course_id) {
      if (!isValidObjectId(String(course_id))) {
        return sendError(
          res,
          400,
          "Invalid course ID.",
          "INVALID_COURSE_ID"
        );
      }

      filter.course_id = course_id;
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return sendError(
          res,
          400,
          "Status must be Active or Inactive.",
          "INVALID_STATUS"
        );
      }

      filter.status = status;
    }

    const safeSearch = String(search)
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (safeSearch) {
      filter.$or = [
        { subjectName: { $regex: safeSearch, $options: "i" } },
        { subjectCode: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (pageNumber - 1) * pageSize;
    const sortDirection = order === "asc" ? 1 : -1;

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .sort({ [sortBy]: sortDirection, _id: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Subject.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Subjects fetched successfully.",
      data: subjects,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: skip + subjects.length < total,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// GET SUBJECT BY ID
// GET /api/subjects/:id
// =====================================================
export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid subject ID.",
        "INVALID_SUBJECT_ID"
      );
    }

    const subject = await Subject.findById(id).lean();

    if (!subject) {
      return sendError(
        res,
        404,
        "Subject not found.",
        "SUBJECT_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Subject fetched successfully.",
      data: subject,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// UPDATE SUBJECT
// PATCH /api/subjects/:id
// =====================================================
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid subject ID.",
        "INVALID_SUBJECT_ID"
      );
    }

    const updates = normalizeSubjectInput(req.body);

    if (!Object.keys(updates).length) {
      return sendError(
        res,
        400,
        "Provide at least one valid field to update.",
        "NO_VALID_FIELDS"
      );
    }

    const fieldError = validateSubjectFields(updates, {
      partial: true,
    });

    if (fieldError) {
      return sendError(
        res,
        400,
        fieldError.message,
        fieldError.code
      );
    }

    if (updates.subjectName !== undefined) {
      updates.subjectName = updates.subjectName.trim();
    }

    if (updates.subjectCode !== undefined) {
      updates.subjectCode = updates.subjectCode.trim().toUpperCase();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.course_id !== undefined) {
      if (
        updates.course_id === null ||
        updates.course_id === ""
      ) {
        updates.$unset = { course_id: 1 };
        delete updates.course_id;
      } else if (!isValidObjectId(String(updates.course_id))) {
        return sendError(
          res,
          400,
          "Please provide a valid course ID.",
          "INVALID_COURSE_ID"
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "syllabus")) {
      const syllabusResult = parseSyllabus(updates.syllabus);

      if (syllabusResult.error) {
        return sendError(
          res,
          400,
          syllabusResult.error,
          "INVALID_SYLLABUS"
        );
      }

      updates.syllabus = syllabusResult.data;
    }

    const updateOperation = { $set: { ...updates } };

    if (updates.$unset) {
      updateOperation.$unset = updates.$unset;
      delete updateOperation.$set.$unset;
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      updateOperation,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!subject) {
      return sendError(
        res,
        404,
        "Subject not found.",
        "SUBJECT_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully.",
      data: subject,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// CHANGE SUBJECT STATUS
// PATCH /api/subjects/:id/status
// =====================================================
export const updateSubjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid subject ID.",
        "INVALID_SUBJECT_ID"
      );
    }

    if (!["Active", "Inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Status must be Active or Inactive.",
        "INVALID_STATUS"
      );
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $set: { status } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!subject) {
      return sendError(
        res,
        404,
        "Subject not found.",
        "SUBJECT_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      message: `Subject ${status.toLowerCase()} successfully.`,
      data: subject,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// DELETE SUBJECT
// DELETE /api/subjects/:id
// =====================================================
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid subject ID.",
        "INVALID_SUBJECT_ID"
      );
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return sendError(
        res,
        404,
        "Subject not found.",
        "SUBJECT_NOT_FOUND"
      );
    }

    // Prevent deletion while other modules reference the subject.
    const Question = mongoose.models.Question;
    const Exam = mongoose.models.Exam;

    if (Question) {
      const questionExists = await Question.exists({
        subject_id: id,
      });

      if (questionExists) {
        return sendError(
          res,
          409,
          "This subject is used by questions. Remove or reassign those questions before deleting it.",
          "SUBJECT_IN_USE"
        );
      }
    }

    if (Exam) {
      const examExists = await Exam.exists({
        subject_id: id,
      });

      if (examExists) {
        return sendError(
          res,
          409,
          "This subject is used by exams and cannot be deleted.",
          "SUBJECT_IN_USE"
        );
      }
    }

    await subject.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully.",
      data: { id: subject._id },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
