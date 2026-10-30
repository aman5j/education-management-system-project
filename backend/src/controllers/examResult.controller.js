
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import ExamResult from "../models/ExamResult.js";
import HallTicket from "../models/HallTicket.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";

const validId = (value) => mongoose.isValidObjectId(value);

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const getActorId = (req) => req.user?._id || req.user?.id || null;

const getGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
};

const populateResult = (query) =>
  query
    .populate("exam_id", "course_id totalQuestions totalMarks marksPerQuestion")
    .populate("course_id", "courseTitle")
    .populate("student_id", "rollNo firstName surname course_id batch_id");

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || 10, 1),
    100
  );

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * GET /api/exam-results
 * Optional query: exam_id, course_id, resultStatus, page, limit
 */
export const getExamResults = async (req, res, next) => {
  try {
    const filter = {};

    for (const key of ["exam_id", "course_id"]) {
      if (req.query[key]) {
        if (!validId(req.query[key])) {
          return fail(res, 400, `Invalid ${key}.`);
        }
        filter[key] = req.query[key];
      }
    }

    if (req.query.resultStatus) {
      if (!["Draft", "Published"].includes(req.query.resultStatus)) {
        return fail(res, 400, "Invalid result status.");
      }
      filter.resultStatus = req.query.resultStatus;
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [results, total] = await Promise.all([
      populateResult(
        ExamResult.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
      ).lean(),
      ExamResult.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        results,
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

/**
 * GET /api/exam-results/exams/:examId/candidates
 * Only active hall tickets qualify a student for result entry.
 */
export const getExamCandidates = async (req, res, next) => {
  try {
    const { examId } = req.params;

    if (!validId(examId)) {
      return fail(res, 400, "Invalid exam ID.");
    }

    const exam = await Exam.findById(examId)
      .select("course_id totalQuestions totalMarks marksPerQuestion")
      .lean();

    if (!exam) {
      return fail(res, 404, "Exam not found.");
    }

    const tickets = await HallTicket.find({
      exam_id: examId,
      status: "Active",
    })
      .select("student_id hallTicketNo")
      .lean();

    const studentIds = tickets.map((ticket) => ticket.student_id);

    const students = await Student.find({
      _id: { $in: studentIds },
    })
      .select("rollNo firstName surname course_id batch_id status")
      .sort({ rollNo: 1, firstName: 1 })
      .lean();

    const existingResults = await ExamResult.find({
      exam_id: examId,
      student_id: { $in: studentIds },
    })
      .select("student_id resultStatus obtainedMarks percentage grade passStatus updatedAt")
      .lean();

    const resultMap = new Map(
      existingResults.map((result) => [
        String(result.student_id),
        result,
      ])
    );

    const ticketMap = new Map(
      tickets.map((ticket) => [
        String(ticket.student_id),
        ticket.hallTicketNo,
      ])
    );

    const candidates = students.map((student) => ({
      ...student,
      hallTicketNo: ticketMap.get(String(student._id)) || "",
      result: resultMap.get(String(student._id)) || null,
    }));

    return res.json({
      success: true,
      data: {
        exam,
        candidates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exam-results/:id
 */
export const getExamResultById = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await populateResult(
      ExamResult.findById(req.params.id)
    ).lean();

    if (!result) {
      return fail(res, 404, "Exam result not found.");
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/exam-results
 * Body:
 * {
 *   exam_id, student_id,
 *   answers: [{ subject_id, question_id, answer: "A" | "B" | "C" | "D" | "" }]
 * }
 *
 * Marks are calculated on the server; submitted scores are never trusted.
 */
export const saveExamResult = async (req, res, next) => {
  try {
    const { exam_id, student_id, answers } = req.body || {};

    if (!validId(exam_id) || !validId(student_id)) {
      return fail(res, 400, "A valid exam and student are required.");
    }

    if (!Array.isArray(answers)) {
      return fail(res, 400, "Answers must be provided as an array.");
    }

    const [exam, student, ticket] = await Promise.all([
      Exam.findById(exam_id).lean(),
      Student.findById(student_id).select("_id course_id status").lean(),
      HallTicket.findOne({
        exam_id,
        student_id,
        status: "Active",
      }).lean(),
    ]);

    if (!exam) return fail(res, 404, "Exam not found.");
    if (!student) return fail(res, 404, "Student not found.");

    if (String(student.course_id) !== String(exam.course_id)) {
      return fail(res, 400, "The student does not belong to this exam's course.");
    }

    if (!ticket) {
      return fail(
        res,
        403,
        "An active hall ticket is required to enter this student's result."
      );
    }

    if (student.status !== "active") {
      return fail(res, 400, "Only active students can receive results.");
    }

    const selectedQuestions = exam.selectedQuestions || [];

    if (answers.length !== selectedQuestions.length) {
      return fail(
        res,
        400,
        `Provide exactly ${selectedQuestions.length} answer entries. Use an empty answer for unanswered questions.`
      );
    }

    const selectedMap = new Map(
      selectedQuestions.map((item) => [
        `${String(item.subject_id)}:${String(item.question_id)}`,
        item,
      ])
    );

    const seen = new Set();

    for (const answer of answers) {
      const subjectId = String(answer?.subject_id || "");
      const questionId = String(answer?.question_id || "");
      const key = `${subjectId}:${questionId}`;

      if (!validId(subjectId) || !validId(questionId)) {
        return fail(res, 400, "An answer contains an invalid question ID.");
      }

      if (!selectedMap.has(key)) {
        return fail(
          res,
          400,
          "An answer references a question not selected for this exam."
        );
      }

      if (seen.has(key)) {
        return fail(res, 400, "Duplicate question answers are not allowed.");
      }

      if (!["A", "B", "C", "D", ""].includes(answer.answer)) {
        return fail(res, 400, "Answers must be A, B, C, D or empty.");
      }

      seen.add(key);
    }

    const subjectIds = [
      ...new Set(selectedQuestions.map((item) => String(item.subject_id))),
    ];

    const subjects = await Subject.find({
      _id: { $in: subjectIds },
    })
      .select("questionBank")
      .lean();

    const questionMap = new Map();

    for (const subject of subjects) {
      for (const question of subject.questionBank || []) {
        questionMap.set(
          `${String(subject._id)}:${String(question._id)}`,
          question
        );
      }
    }

    const marksPerQuestion = Number(exam.marksPerQuestion);
    let obtainedMarks = 0;

    const calculatedAnswers = selectedQuestions.map((selected) => {
      const key = `${String(selected.subject_id)}:${String(selected.question_id)}`;
      const submitted = answers.find(
        (item) =>
          String(item.subject_id) === String(selected.subject_id) &&
          String(item.question_id) === String(selected.question_id)
      );

      const question = questionMap.get(key);

      if (!question) {
        throw Object.assign(
          new Error("A selected question no longer exists in the Subject Question Bank."),
          { status: 409 }
        );
      }

      const chosenAnswer = submitted?.answer || "";
      const isCorrect =
        chosenAnswer !== "" && chosenAnswer === question.correctAnswer;
      const marksAwarded = isCorrect ? marksPerQuestion : 0;

      obtainedMarks += marksAwarded;

      return {
        subject_id: selected.subject_id,
        question_id: selected.question_id,
        answer: chosenAnswer,
        isCorrect,
        marksAwarded,
      };
    });

    obtainedMarks = Number(obtainedMarks.toFixed(4));

    const percentage = Number(
      ((obtainedMarks / Number(exam.totalMarks)) * 100).toFixed(2)
    );

    const resultData = {
      exam_id,
      course_id: exam.course_id,
      student_id,
      answers: calculatedAnswers,
      totalQuestions: exam.totalQuestions,
      totalMarks: exam.totalMarks,
      obtainedMarks,
      percentage,
      grade: getGrade(percentage),
      passStatus: percentage >= 40 ? "Pass" : "Fail",
      updatedBy: getActorId(req),
    };

    const existing = await ExamResult.findOne({ exam_id, student_id });

    if (existing?.attemptStatus === "Submitted") {
      return fail(
        res,
        409,
        "This student has already submitted the online exam. Use the Review Result page to review or correct this submission."
      );
    }

    if (existing?.resultStatus === "Published") {
      return fail(
        res,
        409,
        "This result is already published. Unpublish it before editing."
      );
    }

    let result;

    if (existing) {
      Object.assign(existing, resultData);
      result = await existing.save();
    } else {
      result = await ExamResult.create({
        ...resultData,
        createdBy: getActorId(req),
      });
    }

    const populated = await populateResult(
      ExamResult.findById(result._id)
    ).lean();

    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? "Exam result draft updated successfully."
        : "Exam result draft saved successfully.",
      data: populated,
    });
  } catch (error) {
    if (error.status) {
      return fail(res, error.status, error.message);
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return fail(res, 400, error.message);
    }

    if (error?.code === 11000) {
      return fail(
        res,
        409,
        "A result already exists for this student and exam. Refresh and try again."
      );
    }

    next(error);
  }
};

/**
 * PATCH /api/exam-results/:id/publish
 */
export const publishExamResult = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(req.params.id);

    if (!result) {
      return fail(res, 404, "Exam result not found.");
    }

    if (result.resultStatus === "Published") {
      return fail(res, 409, "This result is already published.");
    }

    result.resultStatus = "Published";
    result.publishedAt = new Date();
    result.updatedBy = getActorId(req);

    await result.save();

    const populated = await populateResult(
      ExamResult.findById(result._id)
    ).lean();

    return res.json({
      success: true,
      message: "Exam result published successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
