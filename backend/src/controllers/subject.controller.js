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

const normalizeSubjectInput = (body = {}) => {
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

  // Keep compatibility with older records/clients.
  // The field is optional and not required to create a subject.
  if (Object.prototype.hasOwnProperty.call(body, "course_id")) {
    input.course_id = body.course_id;
  }

  // Intentionally do not accept syllabus.
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

    const subjectData = {
      subjectName: input.subjectName.trim(),
      subjectCode: input.subjectCode.trim().toUpperCase(),
      description: (input.description || "").trim(),
      status: input.status || "Active",
    };

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
// Supports search, optional legacy course filter,
// status, sorting and pagination.
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

    // Supports filtering legacy records only.
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
    const direction = order === "asc" ? 1 : -1;

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .sort({ [sortBy]: direction, _id: 1 })
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

    // Strip legacy syllabus data from the response, if any exists.
    delete subject.syllabus;

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
// UPDATE SUBJECT STATUS
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

    // Preserve safeguards for modules that already reference subjects.
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
