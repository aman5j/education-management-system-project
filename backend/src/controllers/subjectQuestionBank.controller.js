
import mongoose from "mongoose";
import Subject from "../models/Subject.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const normalizeQuestion = (input = {}) => ({
  questionText: String(input.questionText || "").trim(),
  optionA: String(input.optionA || "").trim(),
  optionB: String(input.optionB || "").trim(),
  optionC: String(input.optionC || "").trim(),
  optionD: String(input.optionD || "").trim(),
  correctAnswer: String(input.correctAnswer || "")
    .trim()
    .toUpperCase(),
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

const getSubject = async (id) => {
  if (!validId(id)) return null;
  return Subject.findById(id);
};

// GET /api/subjects/:id/question-bank
export const getSubjectQuestionBank = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.");
    }

    let questions = subject.questionBank || [];
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();

    if (search) {
      questions = questions.filter((question) =>
        question.questionText.toLowerCase().includes(search)
      );
    }

    return res.status(200).json({
      success: true,
      data: questions,
      total: questions.length,
    });
  } catch (error) {
    console.error("Get subject MCQs error:", error);
    return fail(res, 500, "Unable to load this subject's MCQs.");
  }
};

// POST /api/subjects/:id/question-bank
export const addSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.");
    }

    const question = normalizeQuestion(req.body);
    const validationError = validateQuestion(question);

    if (validationError) {
      return fail(res, 400, validationError);
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
    console.error("Add subject MCQ error:", error);
    return fail(res, 500, "Unable to add the MCQ.");
  }
};

// PATCH /api/subjects/:id/question-bank/:questionId
export const updateSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.");
    }

    const question = subject.questionBank.id(req.params.questionId);

    if (!question) {
      return fail(res, 404, "MCQ not found.");
    }

    const normalized = normalizeQuestion(req.body);
    const validationError = validateQuestion(normalized);

    if (validationError) {
      return fail(res, 400, validationError);
    }

    question.set(normalized);
    await subject.save();

    return res.status(200).json({
      success: true,
      message: "MCQ updated successfully.",
      data: question,
    });
  } catch (error) {
    console.error("Update subject MCQ error:", error);
    return fail(res, 500, "Unable to update the MCQ.");
  }
};

// DELETE /api/subjects/:id/question-bank/:questionId
export const deleteSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.");
    }

    const question = subject.questionBank.id(req.params.questionId);

    if (!question) {
      return fail(res, 404, "MCQ not found.");
    }

    question.deleteOne();
    await subject.save();

    return res.status(200).json({
      success: true,
      message: "MCQ deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subject MCQ error:", error);
    return fail(res, 500, "Unable to delete the MCQ.");
  }
};

// POST /api/subjects/:id/question-bank/import
export const importSubjectQuestions = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) {
      return fail(res, 404, "Subject not found.");
    }

    const rows = req.body.questions;

    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 400, "No MCQs were provided for import.");
    }

    if (rows.length > 500) {
      return fail(res, 400, "Import is limited to 500 MCQs per upload.");
    }

    const imported = [];
    const rejected = [];

    rows.forEach((row, index) => {
      const question = normalizeQuestion(row);
      const validationError = validateQuestion(question);

      if (validationError) {
        // Excel row 1 contains the header.
        rejected.push({
          row: index + 2,
          message: validationError,
        });
      } else {
        imported.push(question);
      }
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
    });
  } catch (error) {
    console.error("Import subject MCQs error:", error);
    return fail(res, 500, "Unable to import MCQs into this subject.");
  }
};
