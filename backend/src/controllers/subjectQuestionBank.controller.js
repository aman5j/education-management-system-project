
import mongoose from "mongoose";
import Subject from "../models/Subject.js";

const MAX_QUESTIONS_PER_SUBJECT = 1000;
const MAX_QUESTIONS_PER_IMPORT = 200;

const fail = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const validId = (value) =>
  typeof value === "string" &&
  mongoose.isValidObjectId(value);

const normalizeQuestion = (input = {}) => ({
  questionText:
    typeof input.questionText === "string"
      ? input.questionText.trim()
      : "",
  optionA:
    typeof input.optionA === "string" ? input.optionA.trim() : "",
  optionB:
    typeof input.optionB === "string" ? input.optionB.trim() : "",
  optionC:
    typeof input.optionC === "string" ? input.optionC.trim() : "",
  optionD:
    typeof input.optionD === "string" ? input.optionD.trim() : "",
  correctAnswer:
    typeof input.correctAnswer === "string"
      ? input.correctAnswer.trim().toUpperCase()
      : "",
});

const validateQuestion = (question) => {
  if (
    question.questionText.length < 3 ||
    question.questionText.length > 5000
  ) {
    return "Question must contain 3 to 5000 characters.";
  }

  for (const key of ["optionA", "optionB", "optionC", "optionD"]) {
    if (!question[key]) {
      return `Option ${key.slice(-1)} is required.`;
    }

    if (question[key].length > 1000) {
      return `Option ${key.slice(-1)} must not exceed 1000 characters.`;
    }
  }

  if (!["A", "B", "C", "D"].includes(question.correctAnswer)) {
    return "Correct answer must be A, B, C, or D.";
  }

  return null;
};

const questionKey = (question) =>
  question.questionText.trim().toLocaleLowerCase();

const getSubject = async (id) => {
  if (!validId(id)) return null;
  return Subject.findById(id);
};

const handleQuestionBankError = (res, error, fallbackMessage) => {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(
      res,
      400,
      Object.values(error.errors)
        .map((item) => item.message)
        .join(", "),
      "VALIDATION_ERROR"
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return fail(res, 400, "Invalid subject or question ID.", "INVALID_ID");
  }

  if (error?.name === "DocumentTooLarge" || error?.code === 17419) {
    return fail(
      res,
      413,
      "Question Bank is too large. Reduce the number or length of questions.",
      "QUESTION_BANK_TOO_LARGE"
    );
  }

  console.error("Subject Question Bank error:", error);
  return fail(res, 500, fallbackMessage, "QUESTION_BANK_ERROR");
};

// GET /api/subjects/:id/question-bank
export const getSubjectQuestionBank = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100)
      .toLocaleLowerCase();

    let questions = subject.questionBank || [];

    if (search) {
      questions = questions.filter((question) =>
        question.questionText.toLocaleLowerCase().includes(search)
      );
    }

    return res.status(200).json({
      success: true,
      data: questions,
      total: questions.length,
    });
  } catch (error) {
    return handleQuestionBankError(
      res,
      error,
      "Unable to load this subject's MCQs."
    );
  }
};

// POST /api/subjects/:id/question-bank
export const addSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    if (subject.questionBank.length >= MAX_QUESTIONS_PER_SUBJECT) {
      return fail(
        res,
        409,
        `A subject cannot contain more than ${MAX_QUESTIONS_PER_SUBJECT} MCQs.`,
        "QUESTION_BANK_LIMIT_REACHED"
      );
    }

    const question = normalizeQuestion(req.body);
    const validationError = validateQuestion(question);

    if (validationError) {
      return fail(res, 400, validationError, "INVALID_QUESTION");
    }

    const key = questionKey(question);
    const duplicate = subject.questionBank.some(
      (existing) => questionKey(existing) === key
    );

    if (duplicate) {
      return fail(
        res,
        409,
        "A question with the same text already exists in this subject.",
        "DUPLICATE_QUESTION"
      );
    }

    subject.questionBank.push(question);
    await subject.save();

    const created = subject.questionBank[subject.questionBank.length - 1];

    return res.status(201).json({
      success: true,
      message: "MCQ added successfully.",
      data: created,
    });
  } catch (error) {
    return handleQuestionBankError(res, error, "Unable to add the MCQ.");
  }
};

// PATCH /api/subjects/:id/question-bank/:questionId
export const updateSubjectQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;

    if (!validId(questionId)) {
      return fail(res, 400, "Invalid question ID.", "INVALID_QUESTION_ID");
    }

    const subject = await getSubject(id);

    if (!subject) {
      return fail(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    const question = subject.questionBank.id(questionId);

    if (!question) {
      return fail(res, 404, "MCQ not found.", "QUESTION_NOT_FOUND");
    }

    const normalized = normalizeQuestion(req.body);
    const validationError = validateQuestion(normalized);

    if (validationError) {
      return fail(res, 400, validationError, "INVALID_QUESTION");
    }

    const key = questionKey(normalized);
    const duplicate = subject.questionBank.some(
      (existing) =>
        existing._id.toString() !== questionId &&
        questionKey(existing) === key
    );

    if (duplicate) {
      return fail(
        res,
        409,
        "Another question with the same text already exists in this subject.",
        "DUPLICATE_QUESTION"
      );
    }

    question.set(normalized);
    await subject.save();

    return res.status(200).json({
      success: true,
      message: "MCQ updated successfully.",
      data: question,
    });
  } catch (error) {
    return handleQuestionBankError(res, error, "Unable to update the MCQ.");
  }
};

// DELETE /api/subjects/:id/question-bank/:questionId
export const deleteSubjectQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;

    if (!validId(questionId)) {
      return fail(res, 400, "Invalid question ID.", "INVALID_QUESTION_ID");
    }

    const subject = await getSubject(id);

    if (!subject) {
      return fail(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    const question = subject.questionBank.id(questionId);

    if (!question) {
      return fail(res, 404, "MCQ not found.", "QUESTION_NOT_FOUND");
    }

    question.deleteOne();
    await subject.save();

    return res.status(200).json({
      success: true,
      message: "MCQ deleted successfully.",
    });
  } catch (error) {
    return handleQuestionBankError(res, error, "Unable to delete the MCQ.");
  }
};

// POST /api/subjects/:id/question-bank/import
export const importSubjectQuestions = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.", "SUBJECT_NOT_FOUND");
    }

    const rows = req.body?.questions;

    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 400, "No MCQs were provided for import.", "EMPTY_IMPORT");
    }

    if (rows.length > MAX_QUESTIONS_PER_IMPORT) {
      return fail(
        res,
        400,
        `Import is limited to ${MAX_QUESTIONS_PER_IMPORT} rows per upload.`,
        "IMPORT_LIMIT_EXCEEDED"
      );
    }

    const existingCount = subject.questionBank.length;
    if (existingCount >= MAX_QUESTIONS_PER_SUBJECT) {
      return fail(
        res,
        409,
        `This subject has reached the ${MAX_QUESTIONS_PER_SUBJECT}-question limit.`,
        "QUESTION_BANK_LIMIT_REACHED"
      );
    }

    const imported = [];
    const rejected = [];
    const knownQuestions = new Set(
      subject.questionBank.map(questionKey)
    );

    rows.forEach((row, index) => {
      const question = normalizeQuestion(row);
      const validationError = validateQuestion(question);

      if (validationError) {
        rejected.push({
          row: index + 2,
          message: validationError,
        });
        return;
      }

      const key = questionKey(question);

      if (knownQuestions.has(key)) {
        rejected.push({
          row: index + 2,
          message: "Duplicate question text already exists in this subject or import.",
        });
        return;
      }

      if (
        existingCount + imported.length >=
        MAX_QUESTIONS_PER_SUBJECT
      ) {
        rejected.push({
          row: index + 2,
          message: `Subject limit of ${MAX_QUESTIONS_PER_SUBJECT} MCQs reached.`,
        });
        return;
      }

      knownQuestions.add(key);
      imported.push(question);
    });

    if (imported.length > 0) {
      subject.questionBank.push(...imported);
      await subject.save();
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${imported.length} MCQ(s).`,
      importedCount: imported.length,
      rejectedCount: rejected.length,
      rejected,
      totalQuestions: subject.questionBank.length,
    });
  } catch (error) {
    return handleQuestionBankError(
      res,
      error,
      "Unable to import MCQs into this subject."
    );
  }
};
