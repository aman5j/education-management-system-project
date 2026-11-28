import mongoose from "mongoose";

const sendError = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const getModel = (req, name) => {
  if (typeof req.getTenantModel !== "function") {
    throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
  }
  return req.getTenantModel(name);
};

const isValidId = (id) =>
  typeof id === "string" && mongoose.isValidObjectId(id);

const handleError = (res, error) => {
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
    return sendError(res, 400, "Invalid subject ID or field value.", "INVALID_ID");
  }

  return sendError(
    res,
    500,
    "An unexpected error occurred while processing the subject request.",
    "INTERNAL_SERVER_ERROR"
  );
};

const normalizeInput = (body = {}) => {
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

  // Retain compatibility with existing optional course_id records.
  if (Object.prototype.hasOwnProperty.call(body, "course_id")) {
    input.course_id = body.course_id;
  }

  // Do not accept syllabus. Question Bank remains embedded and unchanged.
  return input;
};

const validateFields = (data, { partial = false } = {}) => {
  if (
    !partial &&
    (typeof data.subjectName !== "string" || !data.subjectName.trim())
  ) {
    return { message: "Subject name is required.", code: "SUBJECT_NAME_REQUIRED" };
  }

  if (
    !partial &&
    (typeof data.subjectCode !== "string" || !data.subjectCode.trim())
  ) {
    return { message: "Subject code is required.", code: "SUBJECT_CODE_REQUIRED" };
  }

  if (
    data.subjectName !== undefined &&
    (typeof data.subjectName !== "string" ||
      data.subjectName.trim().length < 2 ||
      data.subjectName.trim().length > 100)
  ) {
    return { message: "Subject name must contain 2 to 100 characters.", code: "INVALID_SUBJECT_NAME" };
  }

  if (
    data.subjectCode !== undefined &&
    (typeof data.subjectCode !== "string" ||
      data.subjectCode.trim().length < 2 ||
      data.subjectCode.trim().length > 30)
  ) {
    return { message: "Subject code must contain 2 to 30 characters.", code: "INVALID_SUBJECT_CODE" };
  }

  if (
    data.description !== undefined &&
    (typeof data.description !== "string" ||
      data.description.trim().length > 1000)
  ) {
    return { message: "Description must be a string of at most 1000 characters.", code: "INVALID_DESCRIPTION" };
  }

  if (
    data.status !== undefined &&
    !["Active", "Inactive"].includes(data.status)
  ) {
    return { message: "Status must be Active or Inactive.", code: "INVALID_STATUS" };
  }

  return null;
};

const validateCourseReference = async (Course, courseId) => {
  if (courseId === undefined || courseId === null || courseId === "") {
    return { valid: true, unset: true };
  }

  if (!isValidId(String(courseId))) {
    return { valid: false };
  }

  const exists = await Course.exists({ _id: courseId });
  return { valid: Boolean(exists), unset: false };
};

export const getTenantSubjects = async (req, res, next) => {
  try {
    const Subject = getModel(req, "Subject");
    const {
      search = "",
      status = "",
      page = 1,
      limit = 10,
      sortBy = "subjectName",
      sortOrder = "asc",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const filter = {};

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return sendError(res, 400, "Status must be Active or Inactive.", "INVALID_STATUS");
      }
      filter.status = status;
    }

    const safeSearch = String(search).trim().slice(0, 100);
    if (safeSearch) {
      const regex = { $regex: safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      filter.$or = [{ subjectName: regex }, { subjectCode: regex }];
    }

    const allowedSortFields = [
      "subjectName",
      "subjectCode",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "subjectName";

    const sort = { [safeSortBy]: sortOrder === "desc" ? -1 : 1 };
    const skip = (currentPage - 1) * perPage;

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .select("-questionBank")
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),
      Subject.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: subjects,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantSubject = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid subject ID.", "INVALID_SUBJECT_ID");
    }

    const Subject = getModel(req, "Subject");
    const subject = await Subject.findById(req.params.id).lean();

    if (!subject) {
      return sendError(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    return res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

export const createTenantSubject = async (req, res, next) => {
  try {
    const Subject = getModel(req, "Subject");
    const Course = getModel(req, "Course");
    const input = normalizeInput(req.body);
    const fieldError = validateFields(input);

    if (fieldError) {
      return sendError(res, 400, fieldError.message, fieldError.code);
    }

    const data = {
      subjectName: input.subjectName.trim(),
      subjectCode: input.subjectCode.trim().toUpperCase(),
      description: (input.description || "").trim(),
      status: input.status || "Active",
    };

    if (input.course_id !== undefined) {
      const reference = await validateCourseReference(Course, input.course_id);
      if (!reference.valid) {
        return sendError(res, 400, "Please provide a valid course ID.", "INVALID_COURSE_ID");
      }
      if (!reference.unset) data.course_id = input.course_id;
    }

    const subject = await Subject.create(data);

    return res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      data: subject,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return handleError(res, error);
    }
    next(error);
  }
};

export const updateTenantSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid subject ID.", "INVALID_SUBJECT_ID");
    }

    const Subject = getModel(req, "Subject");
    const Course = getModel(req, "Course");
    const input = normalizeInput(req.body);
    const fieldError = validateFields(input, { partial: true });

    if (fieldError) {
      return sendError(res, 400, fieldError.message, fieldError.code);
    }

    const updates = {};

    if (input.subjectName !== undefined) {
      updates.subjectName = input.subjectName.trim();
    }
    if (input.subjectCode !== undefined) {
      updates.subjectCode = input.subjectCode.trim().toUpperCase();
    }
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }

    const updateOperation = { $set: updates };

    if (input.course_id !== undefined) {
      const reference = await validateCourseReference(Course, input.course_id);

      if (!reference.valid) {
        return sendError(res, 400, "Please provide a valid course ID.", "INVALID_COURSE_ID");
      }

      if (reference.unset) {
        updateOperation.$unset = { course_id: 1 };
      } else {
        updateOperation.$set.course_id = input.course_id;
      }
    }

    const subject = await Subject.findByIdAndUpdate(id, updateOperation, {
      new: true,
      runValidators: true,
    });

    if (!subject) {
      return sendError(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully.",
      data: subject,
    });
  } catch (error) {
    if (error?.code === 11000) return handleError(res, error);
    return next(error);
  }
};

export const updateTenantSubjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid subject ID.", "INVALID_SUBJECT_ID");
    }

    if (!["Active", "Inactive"].includes(status)) {
      return sendError(res, 400, "Status must be Active or Inactive.", "INVALID_STATUS");
    }

    const Subject = getModel(req, "Subject");
    const subject = await Subject.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return sendError(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: `Subject ${status.toLowerCase()} successfully.`,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTenantSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid subject ID.", "INVALID_SUBJECT_ID");
    }

    const Subject = getModel(req, "Subject");
    const Course = getModel(req, "Course");
    const Exam = getModel(req, "Exam");

    const subject = await Subject.findById(id);
    if (!subject) {
      return sendError(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    const courseUsesSubject = await Course.exists({
      $or: [{ subjects: subject._id }, { course_id: subject._id }],
    });

    if (courseUsesSubject) {
      return sendError(
        res,
        409,
        "This subject is assigned to a course. Remove it from the course first.",
        "SUBJECT_IN_USE_BY_COURSE"
      );
    }

    const examUsesSubject = await Exam.exists({ subject_id: subject._id });
    if (examUsesSubject) {
      return sendError(
        res,
        409,
        "This subject is referenced by an exam and cannot be deleted.",
        "SUBJECT_IN_USE_BY_EXAM"
      );
    }

    await subject.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully.",
      data: { id: subject._id },
    });
  } catch (error) {
    next(error);
  }
};