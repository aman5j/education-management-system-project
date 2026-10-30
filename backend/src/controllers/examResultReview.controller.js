import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import ExamResult from "../models/ExamResult.js";
import Subject from "../models/Subject.js";

const validId = (value) => mongoose.isValidObjectId(value);

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const actorId = (req) => req.user?._id || req.user?.id || null;

const gradeFor = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
};

const recalculateResult = (result, exam, questionMap) => {
  const answers = result.answers || [];
  let obtainedMarks = 0;

  for (const answer of answers) {
    const key = `${String(answer.subject_id)}:${String(answer.question_id)}`;
    const question = questionMap.get(key);

    const override = (exam.answerKeyOverrides || []).find(
      (item) =>
        String(item.subject_id) === String(answer.subject_id) &&
        String(item.question_id) === String(answer.question_id)
    );

    const correctAnswer =
      override?.correctAnswer ||
      answer.correctAnswerSnapshot ||
      question?.correctAnswer ||
      "";

    if (!question && !correctAnswer && !answer.marksOverridden) {
      throw Object.assign(
        new Error(
          `Question ${String(answer.question_id)} is unavailable and has no saved answer-key snapshot.`
        ),
        { status: 409 }
      );
    }

    if (correctAnswer) {
      answer.correctAnswerSnapshot = correctAnswer;
      answer.isCorrect = Boolean(
        answer.answer && answer.answer === correctAnswer
      );
    }

    if (!answer.marksOverridden) {
      answer.marksAwarded = answer.isCorrect
        ? Number(exam.marksPerQuestion)
        : 0;
    }

    obtainedMarks += Number(answer.marksAwarded || 0);
  }

  const totalMarks = Number(result.totalMarks || exam.totalMarks || 0);

  if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
    throw Object.assign(
      new Error("Calculated marks are outside the permitted result range."),
      { status: 400 }
    );
  }

  obtainedMarks = Number(obtainedMarks.toFixed(2));

  const percentage =
    totalMarks > 0
      ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2))
      : 0;

  result.obtainedMarks = obtainedMarks;
  result.percentage = percentage;
  result.grade = gradeFor(percentage);
  result.passStatus = percentage >= 40 ? "Pass" : "Fail";
};

const getQuestionMap = async (exam) => {
  const selected = exam.selectedQuestions || [];
  const subjectIds = [
    ...new Set(selected.map((item) => String(item.subject_id))),
  ];

  const subjects = await Subject.find({
    _id: { $in: subjectIds },
  })
    .select("subjectName questionBank")
    .lean();

  const map = new Map();

  for (const subject of subjects) {
    for (const question of subject.questionBank || []) {
      map.set(`${String(subject._id)}:${String(question._id)}`, {
        ...question,
        subjectName: subject.subjectName,
      });
    }
  }

  return map;
};

/**
 * GET /api/exam-results/:id/review
 */
export const getExamResultReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) return fail(res, 400, "Invalid result ID.");

    const result = await ExamResult.findById(id)
      .populate("exam_id", "course_id totalQuestions totalMarks marksPerQuestion answerKeyOverrides")
      .populate("course_id", "courseTitle")
      .populate("student_id", "rollNo firstName surname email")
      .lean();

    if (!result) return fail(res, 404, "Exam result not found.");

    const exam = result.exam_id;

    if (!exam?._id) {
      return fail(res, 409, "The exam linked to this result could not be found.");
    }

    const questionMap = await getQuestionMap(exam);

    const answers = (result.answers || []).map((answer, index) => {
      const key = `${String(answer.subject_id)}:${String(answer.question_id)}`;
      const question = questionMap.get(key) || {};

      const override = (exam.answerKeyOverrides || []).find(
        (item) =>
          String(item.subject_id) === String(answer.subject_id) &&
          String(item.question_id) === String(answer.question_id)
      );

      return {
        number: index + 1,
        subjectId: String(answer.subject_id),
        questionId: String(answer.question_id),
        subjectName: question.subjectName || "Subject",
        questionText: answer.questionTextSnapshot || question.questionText || "Question unavailable",
        options: [
          { key: "A", text: answer.optionASnapshot || question.optionA || "" },
          { key: "B", text: answer.optionBSnapshot || question.optionB || "" },
          { key: "C", text: answer.optionCSnapshot || question.optionC || "" },
          { key: "D", text: answer.optionDSnapshot || question.optionD || "" },
        ],
        selectedAnswer: answer.answer || "",
        correctAnswer:
          result.resultStatus === "Published"
            ? override?.correctAnswer ||
              answer.correctAnswerSnapshot ||
              question.correctAnswer ||
              ""
            : "",
        isCorrect: Boolean(answer.isCorrect),
        marksAwarded: Number(answer.marksAwarded || 0),
        marksOverridden: Boolean(answer.marksOverridden),
        overrideReason: answer.overrideReason || "",
        maxMarks: Number(result.exam_id.marksPerQuestion || 0),
      };
    });

    return res.json({
      success: true,
      data: {
        id: String(result._id),
        examId: String(exam._id),
        course: result.course_id?.courseTitle || "Course unavailable",
        student: {
          id: String(result.student_id?._id || ""),
          name: [
            result.student_id?.firstName,
            result.student_id?.surname,
          ].filter(Boolean).join(" "),
          rollNo: result.student_id?.rollNo || "",
          email: result.student_id?.email || "",
        },
        resultStatus: result.resultStatus,
        attemptStatus: result.attemptStatus,
        totalQuestions: result.totalQuestions,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
        publishedAt: result.publishedAt,
        answers,
        auditHistory: result.auditHistory || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/exam-results/:id/unpublish
 * Body: { reason }
 */
export const unpublishExamResultForCorrection = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const reason = String(req.body?.reason || "").trim();

    if (reason.length < 5) {
      return fail(res, 400, "Provide a correction reason of at least 5 characters.");
    }

    const result = await ExamResult.findById(req.params.id);

    if (!result) return fail(res, 404, "Exam result not found.");

    if (result.resultStatus !== "Published") {
      return fail(res, 409, "Only a published result can be unpublished.");
    }

    result.auditHistory.push({
      action: "UNPUBLISHED",
      reason,
      previousValue: {
        resultStatus: result.resultStatus,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
      },
      newValue: { resultStatus: "Draft" },
      changedBy: actorId(req),
    });

    result.resultStatus = "Draft";
    result.publishedAt = null;
    result.updatedBy = actorId(req);

    await result.save();

    return res.json({
      success: true,
      message: "Result unpublished. You can now make and review corrections.",
      data: { id: String(result._id), resultStatus: result.resultStatus },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/exam-results/:id/questions/:questionId/marks
 * Body: { subject_id, marksAwarded, reason }
 */
export const overrideStudentQuestionMarks = async (req, res, next) => {
  try {
    const { id, questionId } = req.params;
    const { subject_id, marksAwarded } = req.body || {};
    const reason = String(req.body?.reason || "").trim();

    if (!validId(id) || !validId(questionId) || !validId(subject_id)) {
      return fail(res, 400, "Valid result, question and subject IDs are required.");
    }

    if (reason.length < 5) {
      return fail(res, 400, "Provide a correction reason of at least 5 characters.");
    }

    if (!Number.isFinite(Number(marksAwarded))) {
      return fail(res, 400, "Marks awarded must be a valid number.");
    }

    const result = await ExamResult.findById(id);

    if (!result) return fail(res, 404, "Exam result not found.");

    if (result.resultStatus === "Published") {
      return fail(
        res,
        409,
        "Unpublish this result with a reason before changing marks."
      );
    }

    if (result.attemptStatus !== "Submitted") {
      return fail(res, 409, "Only submitted attempts can have their marks corrected.");
    }

    const exam = await Exam.findById(result.exam_id);

    if (!exam) return fail(res, 404, "Exam not found.");

    const answer = result.answers.find(
      (item) =>
        String(item.question_id) === String(questionId) &&
        String(item.subject_id) === String(subject_id)
    );

    if (!answer) {
      return fail(res, 404, "The question is not part of this student's answer sheet.");
    }

    const marks = Number(marksAwarded);
    const maximum = Number(exam.marksPerQuestion);

    if (marks < 0 || marks > maximum) {
      return fail(res, 400, `Marks must be between 0 and ${maximum}.`);
    }

    const previous = {
      marksAwarded: answer.marksAwarded,
      marksOverridden: answer.marksOverridden,
      overrideReason: answer.overrideReason,
    };

    answer.marksAwarded = marks;
    answer.marksOverridden = true;
    answer.overrideReason = reason;

    const questionMap = await getQuestionMap(exam);
    recalculateResult(result, exam, questionMap);

    result.auditHistory.push({
      action: "MARKS_OVERRIDDEN",
      reason,
      question_id: questionId,
      previousValue: previous,
      newValue: {
        marksAwarded: marks,
        marksOverridden: true,
      },
      changedBy: actorId(req),
    });

    result.updatedBy = actorId(req);

    await result.save();

    return res.json({
      success: true,
      message: "Question marks corrected and result recalculated.",
      data: {
        id: String(result._id),
        obtainedMarks: result.obtainedMarks,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
      },
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    next(error);
  }
};

/**
 * POST /api/exam-results/exams/:examId/answer-key/preview
 * Body: { subject_id, question_id, correctAnswer, reason }
 */
export const previewExamAnswerKeyCorrection = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { subject_id, question_id, correctAnswer } = req.body || {};
    const reason = String(req.body?.reason || "").trim();

    if (
      !validId(examId) ||
      !validId(subject_id) ||
      !validId(question_id)
    ) {
      return fail(res, 400, "Valid exam, subject and question IDs are required.");
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return fail(res, 400, "Correct answer must be A, B, C or D.");
    }

    if (reason.length < 5) {
      return fail(res, 400, "Provide a correction reason of at least 5 characters.");
    }

    const exam = await Exam.findById(examId);

    if (!exam) return fail(res, 404, "Exam not found.");

    const selected = (exam.selectedQuestions || []).some(
      (item) =>
        String(item.subject_id) === String(subject_id) &&
        String(item.question_id) === String(question_id)
    );

    if (!selected) {
      return fail(res, 400, "This question is not selected for the specified exam.");
    }

    const results = await ExamResult.find({ exam_id: examId });
    const questionMap = await getQuestionMap(exam);

    const key = `${String(subject_id)}:${String(question_id)}`;
    const question = questionMap.get(key);

    if (!question) return fail(res, 404, "Question not found in the Subject Question Bank.");

    const override = (exam.answerKeyOverrides || []).find(
      (item) =>
        String(item.subject_id) === String(subject_id) &&
        String(item.question_id) === String(question_id)
    );

    const oldCorrectAnswer = override?.correctAnswer || question.correctAnswer;

    const affectedResults = results.map((result) => {
      const cloned = result.toObject();

      const answer = cloned.answers.find(
        (item) =>
          String(item.subject_id) === String(subject_id) &&
          String(item.question_id) === String(question_id)
      );

      if (!answer) {
        return {
          resultId: String(result._id),
          studentId: String(result.student_id),
          resultStatus: result.resultStatus,
          previousMarks: result.obtainedMarks,
          newMarks: result.obtainedMarks,
          changed: false,
        };
      }

      answer.correctAnswerSnapshot = correctAnswer;
      answer.isCorrect = Boolean(answer.answer && answer.answer === correctAnswer);

      if (!answer.marksOverridden) {
        answer.marksAwarded =
          answer.isCorrect ? Number(exam.marksPerQuestion) : 0;
      }

      const total = Number(cloned.totalMarks || exam.totalMarks || 0);
      const newMarks = Number(
        cloned.answers.reduce(
          (sum, item) => sum + Number(item.marksAwarded || 0),
          0
        ).toFixed(2)
      );

      const previousMarks = Number(result.obtainedMarks || 0);

      return {
        resultId: String(result._id),
        studentId: String(result.student_id),
        resultStatus: result.resultStatus,
        previousMarks,
        newMarks,
        percentage: total > 0 ? Number(((newMarks / total) * 100).toFixed(2)) : 0,
        changed: previousMarks !== newMarks,
      };
    });

    const publishedCount = affectedResults.filter(
      (item) => item.resultStatus === "Published"
    ).length;

    return res.json({
      success: true,
      data: {
        examId,
        subject_id,
        question_id,
        oldCorrectAnswer,
        newCorrectAnswer: correctAnswer,
        reason,
        affectedCount: affectedResults.filter((item) => item.changed).length,
        publishedCount,
        requiresUnpublish: publishedCount > 0,
        affectedResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/exam-results/exams/:examId/answer-key/apply
 * Body: { subject_id, question_id, correctAnswer, reason, confirm: true }
 */
export const applyExamAnswerKeyCorrection = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { subject_id, question_id, correctAnswer, confirm } = req.body || {};
    const reason = String(req.body?.reason || "").trim();

    if (!validId(examId) || !validId(subject_id) || !validId(question_id)) {
      return fail(res, 400, "Valid exam, subject and question IDs are required.");
    }

    if (confirm !== true) {
      return fail(res, 400, "Explicit confirmation is required to apply this correction.");
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return fail(res, 400, "Correct answer must be A, B, C or D.");
    }

    if (reason.length < 5) {
      return fail(res, 400, "Provide a correction reason of at least 5 characters.");
    }

    const exam = await Exam.findById(examId);

    if (!exam) return fail(res, 404, "Exam not found.");

    const selected = (exam.selectedQuestions || []).some(
      (item) =>
        String(item.subject_id) === String(subject_id) &&
        String(item.question_id) === String(question_id)
    );

    if (!selected) {
      return fail(res, 400, "This question is not selected for the specified exam.");
    }

    const results = await ExamResult.find({ exam_id: examId });
    const published = results.filter((item) => item.resultStatus === "Published");

    if (published.length) {
      return fail(
        res,
        409,
        `Unpublish all ${published.length} published result(s) for this exam before applying the answer-key correction.`
      );
    }

    const questionMap = await getQuestionMap(exam);
    const key = `${String(subject_id)}:${String(question_id)}`;
    const question = questionMap.get(key);

    if (!question) return fail(res, 404, "Question not found in the Subject Question Bank.");

    let override = (exam.answerKeyOverrides || []).find(
      (item) =>
        String(item.subject_id) === String(subject_id) &&
        String(item.question_id) === String(question_id)
    );

    const oldCorrectAnswer = override?.correctAnswer || question.correctAnswer;

    if (override) {
      override.correctAnswer = correctAnswer;
      override.reason = reason;
      override.updatedBy = actorId(req);
      override.updatedAt = new Date();
    } else {
      exam.answerKeyOverrides.push({
        subject_id,
        question_id,
        correctAnswer,
        reason,
        updatedBy: actorId(req),
        updatedAt: new Date(),
      });
    }

    await exam.save();

    const recalculated = [];

    for (const result of results) {
      const answer = result.answers.find(
        (item) =>
          String(item.subject_id) === String(subject_id) &&
          String(item.question_id) === String(question_id)
      );

      if (!answer) continue;

      const previous = {
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
        questionMarks: answer.marksAwarded,
        isCorrect: answer.isCorrect,
      };

      const effectiveAnswer = (exam.answerKeyOverrides || []).find(
        (item) =>
          String(item.subject_id) === String(subject_id) &&
          String(item.question_id) === String(question_id)
      )?.correctAnswer || correctAnswer;

      answer.correctAnswerSnapshot = effectiveAnswer;
      answer.isCorrect = Boolean(
        answer.answer && answer.answer === effectiveAnswer
      );

      if (!answer.marksOverridden) {
        answer.marksAwarded = answer.isCorrect
          ? Number(exam.marksPerQuestion)
          : 0;
      }

      recalculateResult(result, exam, questionMap);

      result.auditHistory.push({
        action: "ANSWER_KEY_RECALCULATED",
        reason,
        question_id,
        previousValue: previous,
        newValue: {
          obtainedMarks: result.obtainedMarks,
          percentage: result.percentage,
          grade: result.grade,
          passStatus: result.passStatus,
          questionMarks: answer.marksAwarded,
          isCorrect: answer.isCorrect,
        },
        changedBy: actorId(req),
      });

      result.updatedBy = actorId(req);
      await result.save();

      recalculated.push({
        resultId: String(result._id),
        studentId: String(result.student_id),
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
      });
    }

    return res.json({
      success: true,
      message: "Exam-specific answer key updated and affected results recalculated.",
      data: {
        examId,
        subject_id,
        question_id,
        oldCorrectAnswer,
        newCorrectAnswer: correctAnswer,
        recalculatedCount: recalculated.length,
        results: recalculated,
      },
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    next(error);
  }
};