
import mongoose from "mongoose";
import Question from "../models/Question.js";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";

const QUESTION_TYPES = [
  "MCQ",
  "Multiple Select",
  "True/False",
  "Short Answer",
  "Long Answer",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["Draft", "Active", "Archived"];

const sendError = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const isValidId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const editableFields = [
  "questionText",
  "course_id",
  "subject_id",
  "topic",
  "questionType",
  "options",
  "correctAnswers",
  "expectedAnswer",
  "explanation",
  "difficulty",
  "marks",
  "status",
];

const normalizeInput = (body) => {
  const data = {};

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  for (const field of [
    "questionText",
    "topic",
    "expectedAnswer",
    "explanation",
  ]) {
    if (typeof data[field] === "string") {
      data[field] = data[field].trim();
    }
  }

  if (data.marks !== undefined && data.marks !== "") {
    data.marks = Number(data.marks);
  }

  if (data.options !== undefined) {
    if (!Array.isArray(data.options)) {
      return { error: "Options must be an array." };
    }

    data.options = data.options.map((option) => ({
      optionKey: option?.optionKey,
      optionText:
        typeof option?.optionText === "string"
          ? option.optionText.trim()
          : option?.optionText,
    }));
  }

  if (data.correctAnswers !== undefined) {
    if (
      !Array.isArray(data.correctAnswers) ||
      !data.correctAnswers.every((answer) => typeof answer === "string")
    ) {
      return { error: "Correct answers must be an array of option keys." };
    }

    data.correctAnswers = [
      ...new Set(data.correctAnswers.map((answer) => answer.trim())),
    ];
  }

  return { data };
};

const validateQuestion = (data, partial = false) => {
  const requiredFields = [
    "questionText",
    "course_id",
    "subject_id",
    "questionType",
    "difficulty",
    "marks",
  ];

  if (!partial) {
    const missing = requiredFields.find(
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
    data.questionText !== undefined &&
    (typeof data.questionText !== "string" ||
      data.questionText.length < 3 ||
      data.questionText.length > 5000)
  ) {
    return "Question text must contain between 3 and 5000 characters.";
  }

  if (
    data.questionType !== undefined &&
    !QUESTION_TYPES.includes(data.questionType)
  ) {
    return "Invalid question type.";
  }

  // ---> INSERT HERE <---
  const optionBasedTypes = [
    "MCQ",
    "Multiple Select",
    "True/False",
  ];

  if (
    optionBasedTypes.includes(data.questionType) &&
    (!Array.isArray(data.options) ||
      data.options.length < 2 ||
      data.options.length > 5)
  ) {
    return "This question type requires between 2 and 5 options.";
  }

  if (
    optionBasedTypes.includes(data.questionType) &&
    (!Array.isArray(data.correctAnswers) ||
      data.correctAnswers.length === 0)
  ) {
    return "Select at least one correct answer.";
  }
  // ---> END OF INSERTION <---

  if (
    data.difficulty !== undefined &&
    !DIFFICULTIES.includes(data.difficulty)
  ) {
    return "Difficulty must be Easy, Medium, or Hard.";
  }

  if (
    data.status !== undefined &&
    !STATUSES.includes(data.status)
  ) {
    return "Status must be Draft, Active, or Archived.";
  }

  if (
    data.marks !== undefined &&
    (!Number.isInteger(data.marks) ||
      data.marks < 1 ||
      data.marks > 1000)
  ) {
    return "Marks must be a whole number between 1 and 1000.";
  }

  if (
    data.topic !== undefined &&
    (typeof data.topic !== "string" || data.topic.length > 150)
  ) {
    return "Topic cannot exceed 150 characters.";
  }

  if (
    data.expectedAnswer !== undefined &&
    (typeof data.expectedAnswer !== "string" ||
      data.expectedAnswer.length > 5000)
  ) {
    return "Expected answer cannot exceed 5000 characters.";
  }

  if (
    data.explanation !== undefined &&
    (typeof data.explanation !== "string" ||
      data.explanation.length > 3000)
  ) {
    return "Explanation cannot exceed 3000 characters.";
  }

  if (data.options !== undefined) {
    if (!Array.isArray(data.options)) {
      return "Options must be an array.";
    }

    const keys = data.options.map((option) => option.optionKey);
    const uniqueKeys = new Set(keys);

    if (
      data.options.some(
        (option) =>
          typeof option.optionKey !== "string" ||
          !option.optionKey.trim() ||
          typeof option.optionText !== "string" ||
          !option.optionText.trim()
      )
    ) {
      return "Every option must have an optionKey and optionText.";
    }

    if (uniqueKeys.size !== keys.length) {
      return "Option keys must be unique within a question.";
    }

    if (data.options.length > 5) {
      return "A question cannot have more than 5 options.";
    }

    if (
      data.questionType === "MCQ" &&
      (data.options.length < 2 || data.options.length > 5)
    ) {
      return "MCQ requires between 2 and 5 options.";
    }

    if (
      data.questionType === "Multiple Select" &&
      (data.options.length < 2 || data.options.length > 5)
    ) {
      return "Multiple Select requires between 2 and 5 options.";
    }

    if (data.questionType === "True/False") {
      const values = data.options
        .map((option) => option.optionText.trim().toLowerCase())
        .sort();

      if (
        values.length !== 2 ||
        values[0] !== "false" ||
        values[1] !== "true"
      ) {
        return 'True/False questions must have exactly the options "True" and "False".';
      }
    }

    if (
      ["Short Answer", "Long Answer"].includes(data.questionType) &&
      data.options.length !== 0
    ) {
      return "Short Answer and Long Answer questions cannot have options.";
    }
  }

  if (data.correctAnswers !== undefined) {
    if (!Array.isArray(data.correctAnswers)) {
      return "Correct answers must be an array.";
    }

    if (
      data.questionType === "MCQ" &&
      data.correctAnswers.length !== 1
    ) {
      return "MCQ must have exactly one correct answer.";
    }

    if (
      data.questionType === "Multiple Select" &&
      data.correctAnswers.length < 1
    ) {
      return "Multiple Select must have at least one correct answer.";
    }

    if (
      data.questionType === "True/False" &&
      data.correctAnswers.length !== 1
    ) {
      return "True/False must have exactly one correct answer.";
    }

    if (
      ["Short Answer", "Long Answer"].includes(data.questionType) &&
      data.correctAnswers.length !== 0
    ) {
      return "Text-answer questions cannot use correct option keys.";
    }

    if (data.options !== undefined) {
      const validKeys = new Set(
        data.options.map((option) => option.optionKey)
      );

      if (data.correctAnswers.some((key) => !validKeys.has(key))) {
        return "Every correct answer must match an existing option key.";
      }
    }
  }

  // Ensure option and answer data are consistent even when
  // the client changes the question type during an edit.
  if (data.questionType && data.options !== undefined) {
    const needsOptions = [
      "MCQ",
      "Multiple Select",
      "True/False",
    ].includes(data.questionType);

    if (
      needsOptions &&
      data.options.length > 0 &&
      data.correctAnswers === undefined
    ) {
      return "Provide correctAnswers when submitting question options.";
    }
  }

  return null;
};

const validateRelationships = async (data) => {
  if (!isValidId(String(data.course_id || ""))) {
    return { status: 400, message: "Please select a valid course." };
  }

  if (!isValidId(String(data.subject_id || ""))) {
    return { status: 400, message: "Please select a valid subject." };
  }

  const [course, subject] = await Promise.all([
    Course.findById(data.course_id).select("_id"),
    Subject.findById(data.subject_id).select("course_id status"),
  ]);

  if (!course) {
    return { status: 404, message: "Selected course was not found." };
  }

  if (!subject) {
    return { status: 404, message: "Selected subject was not found." };
  }

  if (String(subject.course_id) !== String(data.course_id)) {
    return {
      status: 400,
      message: "The selected subject does not belong to this course.",
    };
  }

  if (subject.status !== "Active") {
    return {
      status: 400,
      message: "Questions can only be assigned to active subjects.",
    };
  }

  return null;
};

const populateQuestion = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate("subject_id", "subjectName subjectCode")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

// GET /api/questions
export const getQuestions = async (req, res, next) => {
  try {
    const {
      search = "",
      course_id,
      subject_id,
      questionType,
      difficulty,
      status,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return sendError(res, 400, "Page must be a positive integer.");
    }

    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return sendError(res, 400, "Limit must be between 1 and 100.");
    }

    const filter = {};

    for (const [field, value] of Object.entries({
      course_id,
      subject_id,
    })) {
      if (value) {
        if (!isValidId(value)) {
          return sendError(res, 400, `Invalid ${field}.`);
        }
        filter[field] = value;
      }
    }

    if (questionType) {
      if (!QUESTION_TYPES.includes(questionType)) {
        return sendError(res, 400, "Invalid question type.");
      }
      filter.questionType = questionType;
    }

    if (difficulty) {
      if (!DIFFICULTIES.includes(difficulty)) {
        return sendError(res, 400, "Invalid difficulty.");
      }
      filter.difficulty = difficulty;
    }

    if (status) {
      if (!STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid question status.");
      }
      filter.status = status;
    }

    const safeSearch = String(search)
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (safeSearch) {
      filter.$or = [
        { questionText: { $regex: safeSearch, $options: "i" } },
        { topic: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (pageNumber - 1) * pageSize;

    const [questions, total] = await Promise.all([
      populateQuestion(
        Question.find(filter)
          .sort({ createdAt: -1, _id: 1 })
          .skip(skip)
          .limit(pageSize)
      ).lean(),
      Question.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Questions fetched successfully.",
      data: questions,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: skip + questions.length < total,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/questions/:id
export const getQuestionById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid question ID.");
    }

    const question = await populateQuestion(
      Question.findById(req.params.id)
    ).lean();

    if (!question) {
      return sendError(res, 404, "Question not found.");
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/questions
export const createQuestion = async (req, res, next) => {
  try {
    const normalized = normalizeInput(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const data = normalized.data;
    const validationError = validateQuestion(data);

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

    const question = await Question.create({
      ...data,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await populateQuestion(
      Question.findById(question._id)
    );

    return res.status(201).json({
      success: true,
      message: "Question created successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/questions/:id
export const updateQuestion = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid question ID.");
    }

    const question = await Question.findById(req.params.id);

    if (!question) {
      return sendError(res, 404, "Question not found.");
    }

    const normalized = normalizeInput(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const updates = normalized.data;

    if (!Object.keys(updates).length) {
      return sendError(res, 400, "No supported fields were provided.");
    }

    const merged = { ...question.toObject(), ...updates };

    // Validate the complete resulting question, including
    // its options and correct answer keys.
    const validationError = validateQuestion(merged, true);

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

    Object.assign(question, updates);
    question.updatedBy = req.user._id;

    await question.save();

    const populated = await populateQuestion(
      Question.findById(question._id)
    );

    return res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/questions/:id/status
export const updateQuestionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid question ID.");
    }

    if (!STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid question status.");
    }

    const question = await Question.findById(id);

    if (!question) {
      return sendError(res, 404, "Question not found.");
    }

    question.status = status;
    question.updatedBy = req.user._id;

    await question.save();

    return res.status(200).json({
      success: true,
      message: "Question status updated successfully.",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/questions/:id
export const deleteQuestion = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid question ID.");
    }

    const question = await Question.findById(req.params.id);

    if (!question) {
      return sendError(res, 404, "Question not found.");
    }

    await question.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully.",
      data: { id: question._id },
    });
  } catch (error) {
    next(error);
  }
};
