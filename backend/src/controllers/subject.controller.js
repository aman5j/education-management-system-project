
import mongoose from "mongoose";
import Subject from "../models/Subject.js";
import Course from "../models/Course.js";

// =====================================================
// COMMON HELPERS
// =====================================================

const sendError = (res, statusCode, message, errorCode) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });
};

const handleControllerError = (res, error) => {
  // Duplicate subject code within the same course.
  if (error?.code === 11000) {
    return sendError(
      res,
      409,
      "This subject code already exists for the selected course.",
      "DUPLICATE_SUBJECT_CODE"
    );
  }

  // Mongoose validation error.
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

  // Invalid MongoDB ObjectId.
  if (error instanceof mongoose.Error.CastError) {
    return sendError(
      res,
      400,
      "Invalid subject or course ID.",
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

const isValidObjectId = (id) => {
  return mongoose.isValidObjectId(id);
};

const normalizeSubjectInput = (body) => {
  const input = {};

  if (Object.prototype.hasOwnProperty.call(body, "subjectName")) {
    input.subjectName = body.subjectName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "subjectCode")) {
    input.subjectCode = body.subjectCode;
  }

  if (Object.prototype.hasOwnProperty.call(body, "course_id")) {
    input.course_id = body.course_id;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    input.description = body.description;
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    input.status = body.status;
  }

  return input;
};

// =====================================================
// CREATE SUBJECT
// POST /api/subjects
// =====================================================

export const createSubject = async (req, res) => {
  try {
    const {
      subjectName,
      subjectCode,
      course_id,
      description,
      status,
    } = req.body;

    // Required fields.
    if (
      typeof subjectName !== "string" ||
      !subjectName.trim()
    ) {
      return sendError(
        res,
        400,
        "Subject name is required.",
        "SUBJECT_NAME_REQUIRED"
      );
    }

    if (
      typeof subjectCode !== "string" ||
      !subjectCode.trim()
    ) {
      return sendError(
        res,
        400,
        "Subject code is required.",
        "SUBJECT_CODE_REQUIRED"
      );
    }

    if (!course_id) {
      return sendError(
        res,
        400,
        "Please select a course.",
        "COURSE_REQUIRED"
      );
    }

    if (!isValidObjectId(course_id)) {
      return sendError(
        res,
        400,
        "Please provide a valid course ID.",
        "INVALID_COURSE_ID"
      );
    }

    // Validate field types before saving.
    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return sendError(
        res,
        400,
        "Description must be a string.",
        "INVALID_DESCRIPTION"
      );
    }

    if (
      status !== undefined &&
      !["Active", "Inactive"].includes(status)
    ) {
      return sendError(
        res,
        400,
        "Status must be Active or Inactive.",
        "INVALID_STATUS"
      );
    }

    // Ensure the selected course exists.
    const courseExists = await Course.exists({
      _id: course_id,
    });

    if (!courseExists) {
      return sendError(
        res,
        404,
        "The selected course was not found.",
        "COURSE_NOT_FOUND"
      );
    }

    const subject = await Subject.create({
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim().toUpperCase(),
      course_id,
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      status: status || "Active",
    });

    const populatedSubject = await Subject.findById(
      subject._id
    ).populate("course_id");

    return res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      data: populatedSubject,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// GET ALL SUBJECTS
// GET /api/subjects
// Supports search, filters, sorting and pagination.
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

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1
    ) {
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

    if (course_id) {
      if (!isValidObjectId(course_id)) {
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

    // Escape regex special characters so search input
    // is treated as plain text, not a regex expression.
    const safeSearch = String(search)
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (safeSearch) {
      filter.$or = [
        {
          subjectName: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          subjectCode: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const skip = (pageNumber - 1) * pageSize;

    const sortDirection = order === "asc" ? 1 : -1;

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .populate("course_id")
        .sort({
          [sortBy]: sortDirection,
          _id: 1,
        })
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

    const subject = await Subject.findById(id)
      .populate("course_id")
      .lean();

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

    if (Object.keys(updates).length === 0) {
      return sendError(
        res,
        400,
        "Provide at least one valid field to update.",
        "NO_VALID_FIELDS"
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "subjectName"
      ) &&
      (
        typeof updates.subjectName !== "string" ||
        !updates.subjectName.trim()
      )
    ) {
      return sendError(
        res,
        400,
        "Subject name cannot be empty.",
        "INVALID_SUBJECT_NAME"
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "subjectCode"
      )
    ) {
      if (
        typeof updates.subjectCode !== "string" ||
        !updates.subjectCode.trim()
      ) {
        return sendError(
          res,
          400,
          "Subject code cannot be empty.",
          "INVALID_SUBJECT_CODE"
        );
      }

      updates.subjectCode =
        updates.subjectCode.trim().toUpperCase();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "subjectName"
      )
    ) {
      updates.subjectName = updates.subjectName.trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "description"
      )
    ) {
      if (typeof updates.description !== "string") {
        return sendError(
          res,
          400,
          "Description must be a string.",
          "INVALID_DESCRIPTION"
        );
      }

      updates.description = updates.description.trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "status"
      ) &&
      !["Active", "Inactive"].includes(updates.status)
    ) {
      return sendError(
        res,
        400,
        "Status must be Active or Inactive.",
        "INVALID_STATUS"
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "course_id"
      )
    ) {
      if (!isValidObjectId(updates.course_id)) {
        return sendError(
          res,
          400,
          "Please provide a valid course ID.",
          "INVALID_COURSE_ID"
        );
      }

      const courseExists = await Course.exists({
        _id: updates.course_id,
      });

      if (!courseExists) {
        return sendError(
          res,
          404,
          "The selected course was not found.",
          "COURSE_NOT_FOUND"
        );
      }
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).populate("course_id");

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
    ).populate("course_id");

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

    // Add checks here before deletion if other modules
    // already reference subjects, such as exams or marks.
    await subject.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully.",
      data: {
        id: subject._id,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
