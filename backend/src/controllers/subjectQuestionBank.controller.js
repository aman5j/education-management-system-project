
import mongoose from "mongoose";
import Subject from "../models/Subject.js";

const QUESTION_TYPES = [
  "MCQ",
  "Multiple Select",
  "True/False",
  "Short Answer",
  "Long Answer",
];

const OPTION_TYPES = ["MCQ", "Multiple Select", "True/False"];

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const validId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const normalizeQuestion = (input = {}) => {
  const question = {
    questionText: String(input.questionText || "").trim(),
    topic: String(input.topic || "").trim(),
    questionType: input.questionType || "MCQ",
    options: Array.isArray(input.options)
      ? input.options.map((option) => ({
          optionKey: String(option.optionKey || "").trim().toUpperCase(),
          optionText: String(option.optionText || "").trim(),
        }))
      : [],
    correctAnswers: Array.isArray(input.correctAnswers)
      ? [...new Set(input.correctAnswers.map((value) =>
          String(value).trim().toUpperCase()
        ))]
      : [],
    expectedAnswer: String(input.expectedAnswer || "").trim(),
    explanation: String(input.explanation || "").trim(),
    difficulty: input.difficulty || "Medium",
    marks: Number(input.marks ?? 1),
    status: input.status || "Draft",
  };

  return question;
};

const validateQuestion = (question) => {
  if (
    question.questionText.length < 3 ||
    question.questionText.length > 5000
  ) {
    return "Question must contain 3 to 5000 characters.";
  }

  if (!QUESTION_TYPES.includes(question.questionType)) {
    return "Invalid question type.";
  }

  if (!["Easy", "Medium", "Hard"].includes(question.difficulty)) {
    return "Difficulty must be Easy, Medium, or Hard.";
  }

  if (!["Draft", "Active", "Archived"].includes(question.status)) {
    return "Status must be Draft, Active, or Archived.";
  }

  if (
    !Number.isInteger(question.marks) ||
    question.marks < 1 ||
    question.marks > 1000
  ) {
    return "Marks must be a whole number between 1 and 1000.";
  }

  if (
    question.topic.length > 150 ||
    question.expectedAnswer.length > 5000 ||
    question.explanation.length > 3000
  ) {
    return "Topic, expected answer, or explanation exceeds its maximum length.";
  }

  if (OPTION_TYPES.includes(question.questionType)) {
    if (question.options.length < 2 || question.options.length > 5) {
      return "This question type requires 2 to 5 options.";
    }

    const keys = question.options.map((option) => option.optionKey);

    if (
      question.options.some(
        (option) => !option.optionKey || !option.optionText
      )
    ) {
      return "Every option must have a key and text.";
    }

    if (new Set(keys).size !== keys.length) {
      return "Option keys must be unique.";
    }

    if (
      !question.correctAnswers.length ||
      question.correctAnswers.some((answer) => !keys.includes(answer))
    ) {
      return "Choose at least one valid correct answer.";
    }

    if (
      question.questionType === "MCQ" &&
      question.correctAnswers.length !== 1
    ) {
      return "MCQ must have exactly one correct answer.";
    }

    if (
      question.questionType === "True/False" &&
      (question.options.length !== 2 ||
        !["A", "B"].every((key) => keys.includes(key)))
    ) {
      return "True/False requires options A and B.";
    }
  } else {
    question.options = [];
    question.correctAnswers = [];
  }

  return null;
};

const getSubject = async (id) => {
  if (!validId(id)) return null;
  return Subject.findById(id);
};

export const getSubjectQuestionBank = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) return fail(res, 404, "Subject not found.");

    let questions = subject.questionBank || [];

    const search = String(req.query.search || "").trim().toLowerCase();
    const status = String(req.query.status || "");
    const type = String(req.query.questionType || "");

    if (search) {
      questions = questions.filter((question) =>
        [question.questionText, question.topic]
          .some((value) => String(value || "").toLowerCase().includes(search))
      );
    }

    if (status) {
      questions = questions.filter((question) => question.status === status);
    }

    if (type) {
      questions = questions.filter((question) => question.questionType === type);
    }

    return res.json({
      success: true,
      data: questions,
      total: questions.length,
    });
  } catch (error) {
    console.error("Get embedded question bank error:", error);
    return fail(res, 500, "Unable to load this subject's question bank.");
  }
};

export const addSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) return fail(res, 404, "Subject not found.");

    const question = normalizeQuestion(req.body);
    const validationError = validateQuestion(question);

    if (validationError) return fail(res, 400, validationError);

    subject.questionBank.push(question);
    await subject.save();

    const created = subject.questionBank[subject.questionBank.length - 1];

    return res.status(201).json({
      success: true,
      message: "Question added to this subject.",
      data: created,
    });
  } catch (error) {
    console.error("Add embedded question error:", error);
    return fail(res, 500, "Unable to add the question.");
  }
};

export const updateSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) return fail(res, 404, "Subject not found.");

    const question = subject.questionBank.id(req.params.questionId);

    if (!question) return fail(res, 404, "Question not found.");

    const normalized = normalizeQuestion(req.body);
    const validationError = validateQuestion(normalized);

    if (validationError) return fail(res, 400, validationError);

    question.set(normalized);
    await subject.save();

    return res.json({
      success: true,
      message: "Question updated successfully.",
      data: question,
    });
  } catch (error) {
    console.error("Update embedded question error:", error);
    return fail(res, 500, "Unable to update the question.");
  }
};

export const deleteSubjectQuestion = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) return fail(res, 404, "Subject not found.");

    const question = subject.questionBank.id(req.params.questionId);

    if (!question) return fail(res, 404, "Question not found.");

    question.deleteOne();
    await subject.save();

    return res.json({
      success: true,
      message: "Question deleted successfully.",
    });
  } catch (error) {
    console.error("Delete embedded question error:", error);
    return fail(res, 500, "Unable to delete the question.");
  }
};

export const importSubjectQuestions = async (req, res) => {
  try {
    const subject = await getSubject(req.params.id);

    if (!subject) return fail(res, 404, "Subject not found.");

    const rows = req.body.questions;

    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 400, "No questions were provided for import.");
    }

    if (rows.length > 500) {
      return fail(res, 400, "Import is limited to 500 questions per upload.");
    }

    const imported = [];
    const rejected = [];

    rows.forEach((row, index) => {
      const question = normalizeQuestion(row);
      const error = validateQuestion(question);

      if (error) {
        rejected.push({ row: index + 2, message: error });
      } else {
        imported.push(question);
      }
    });

    if (imported.length) {
      subject.questionBank.push(...imported);
      await subject.save();
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${imported.length} question(s).`,
      importedCount: imported.length,
      rejectedCount: rejected.length,
      rejected,
    });
  } catch (error) {
    console.error("Import embedded questions error:", error);
    return fail(res, 500, "Unable to import questions into this subject.");
  }
};
