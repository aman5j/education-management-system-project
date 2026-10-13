import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const normalizePayload = (body = {}) => {
  const course_id = String(body.course_id || "").trim();
  const totalQuestions = Number(body.totalQuestions);
  const totalMarks = Number(body.totalMarks);
  const selectedQuestions = body.selectedQuestions;

  if (!isValidId(course_id)) {
    return { error: "Please select a valid course." };
  }

  if (
    !Number.isInteger(totalQuestions) ||
    totalQuestions < 1 ||
    totalQuestions > 500
  ) {
    return { error: "Total questions must be between 1 and 500." };
  }

  if (
    !Number.isFinite(totalMarks) ||
    totalMarks <= 0 ||
    totalMarks > 100000
  ) {
    return { error: "Total marks must be greater than zero." };
  }

  if (!Array.isArray(selectedQuestions)) {
    return { error: "Please select exam questions." };
  }

  if (selectedQuestions.length !== totalQuestions) {
    return {
      error: `Select exactly ${totalQuestions} questions.`,
    };
  }

  const normalizedQuestions = [];
  const seen = new Set();

  for (const item of selectedQuestions) {
    const subject_id = String(item?.subject_id || "");
    const question_id = String(item?.question_id || "");

    if (!isValidId(subject_id) || !isValidId(question_id)) {
      return { error: "A selected question has an invalid ID." };
    }

    const key = `${subject_id}:${question_id}`;

    if (seen.has(key)) {
      return { error: "Duplicate questions are not allowed." };
    }

    seen.add(key);
    normalizedQuestions.push({ subject_id, question_id });
  }

  return {
    data: {
      course_id,
      totalQuestions,
      totalMarks,
      marksPerQuestion: Number(
        (totalMarks / totalQuestions).toFixed(6)
      ),
      selectedQuestions: normalizedQuestions,
    },
  };
};

const validateQuestionRelationships = async (data) => {
  const course = await Course.findById(data.course_id)
    .select("courseTitle subjects")
    .lean();

  if (!course) {
    return {
      status: 404,
      message: "Selected course was not found.",
    };
  }

  const courseSubjectIds = new Set(
    (course.subjects || []).map((id) => String(id))
  );

  const subjectIds = [
    ...new Set(data.selectedQuestions.map((q) => q.subject_id)),
  ];

  const subjects = await Subject.find({
    _id: { $in: subjectIds },
  })
    .select("subjectName status questionBank")
    .lean();

  const subjectMap = new Map(
    subjects.map((subject) => [String(subject._id), subject])
  );

  for (const selected of data.selectedQuestions) {
    if (!courseSubjectIds.has(selected.subject_id)) {
      return {
        status: 400,
        message:
          "A selected question does not belong to a subject linked to this course.",
      };
    }

    const subject = subjectMap.get(selected.subject_id);

    if (!subject || subject.status !== "Active") {
      return {
        status: 400,
        message: "A selected subject is missing or inactive.",
      };
    }

    const exists = (subject.questionBank || []).some(
      (question) => String(question._id) === selected.question_id
    );

    if (!exists) {
      return {
        status: 400,
        message:
          "A selected MCQ was not found in its subject Question Bank.",
      };
    }
  }

  return null;
};

const populateExam = (query) =>
  query.populate("course_id", "courseTitle courseType");

export const getExams = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const filter = {};

    if (req.query.course_id) {
      if (!isValidId(req.query.course_id)) {
        return sendError(res, 400, "Invalid course ID.");
      }
      filter.course_id = req.query.course_id;
    }

    const [exams, total] = await Promise.all([
      populateExam(
        Exam.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ).lean(),
      Exam.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        exams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.");
    }

    const exam = await populateExam(Exam.findById(req.params.id)).lean();

    if (!exam) {
      return sendError(res, 404, "Exam not found.");
    }

    return res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

export const createExam = async (req, res, next) => {
  try {
    const normalized = normalizePayload(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const data = normalized.data;
    const relationshipError = await validateQuestionRelationships(data);

    if (relationshipError) {
      return sendError(
        res,
        relationshipError.status,
        relationshipError.message
      );
    }

    const exam = await Exam.create(data);
    const populated = await populateExam(
      Exam.findById(exam._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      data: populated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return sendError(res, 400, error.message);
    }
    next(error);
  }
};

export const updateExam = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.");
    }

    const existing = await Exam.findById(req.params.id);

    if (!existing) {
      return sendError(res, 404, "Exam not found.");
    }

    const normalized = normalizePayload(req.body);

    if (normalized.error) {
      return sendError(res, 400, normalized.error);
    }

    const data = normalized.data;
    const relationshipError = await validateQuestionRelationships(data);

    if (relationshipError) {
      return sendError(
        res,
        relationshipError.status,
        relationshipError.message
      );
    }

    Object.assign(existing, data);
    await existing.save();

    const populated = await populateExam(
      Exam.findById(existing._id)
    ).lean();

    return res.json({
      success: true,
      message: "Exam updated successfully.",
      data: populated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return sendError(res, 400, error.message);
    }
    next(error);
  }
};

export const deleteExam = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Invalid exam ID.");
    }

    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return sendError(res, 404, "Exam not found.");
    }

    return res.json({
      success: true,
      message: "Exam deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};