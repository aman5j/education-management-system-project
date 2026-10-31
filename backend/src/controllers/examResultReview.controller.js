import mongoose from "mongoose";

import ExamResult from "../models/ExamResult.js";
import Subject from "../models/Subject.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (value) =>
  mongoose.isValidObjectId(value);

/*
|--------------------------------------------------------------------------
| Read-only Exam Answer Sheet
|--------------------------------------------------------------------------
| GET /api/exam-results/:id/review
|
| This endpoint only reads and returns the submitted answers.
| It does not update marks, publish results or modify answer keys.
|--------------------------------------------------------------------------
*/

export const getExamResultReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(id)
      .populate(
        "exam_id",
        "course_id totalQuestions totalMarks marksPerQuestion selectedQuestions"
      )
      .populate("course_id", "courseTitle")
      .populate(
        "student_id",
        "rollNo firstName surname email"
      )
      .lean();

    if (!result) {
      return fail(res, 404, "Exam result not found.");
    }

    const exam = result.exam_id;

    if (!exam?._id) {
      return fail(
        res,
        409,
        "The exam linked to this result could not be found."
      );
    }

    /*
     * Load current question-bank data as a fallback.
     * Saved answer snapshots take priority so the answer sheet
     * can still display questions if their original content changes.
     */
    const selectedQuestions = exam.selectedQuestions || [];

    const subjectIds = [
      ...new Set(
        selectedQuestions.map((item) =>
          String(item.subject_id)
        )
      ),
    ];

    const subjects = subjectIds.length
      ? await Subject.find({
          _id: { $in: subjectIds },
        })
          .select("subjectName questionBank")
          .lean()
      : [];

    const questionMap = new Map();

    for (const subject of subjects) {
      for (const question of subject.questionBank || []) {
        const key = `${String(subject._id)}:${String(question._id)}`;

        questionMap.set(key, {
          ...question,
          subjectName: subject.subjectName || "",
        });
      }
    }

    const answers = (result.answers || []).map(
      (answer, index) => {
        const key = `${String(answer.subject_id)}:${String(
          answer.question_id
        )}`;

        const question = questionMap.get(key) || {};

        const selectedAnswer = answer.answer || "";

        const correctAnswer =
          answer.correctAnswerSnapshot ||
          question.correctAnswer ||
          "";

        const isCorrect =
          Boolean(selectedAnswer) &&
          Boolean(correctAnswer) &&
          selectedAnswer === correctAnswer;

        return {
          number: index + 1,

          subjectId: String(answer.subject_id || ""),
          questionId: String(answer.question_id || ""),

          subjectName:
            answer.subjectNameSnapshot ||
            question.subjectName ||
            "Subject",

          questionText:
            answer.questionTextSnapshot ||
            question.questionText ||
            "Question unavailable",

          options: [
            {
              key: "A",
              text:
                answer.optionASnapshot ||
                question.optionA ||
                "",
            },
            {
              key: "B",
              text:
                answer.optionBSnapshot ||
                question.optionB ||
                "",
            },
            {
              key: "C",
              text:
                answer.optionCSnapshot ||
                question.optionC ||
                "",
            },
            {
              key: "D",
              text:
                answer.optionDSnapshot ||
                question.optionD ||
                "",
            },
          ],

          selectedAnswer,
          correctAnswer,
          isCorrect,

          marksAwarded: Number(
            answer.marksAwarded || 0
          ),

          maxMarks: Number(
            exam.marksPerQuestion || 0
          ),
        };
      }
    );

    return res.json({
      success: true,

      data: {
        id: String(result._id),
        examId: String(exam._id),

        course:
          result.course_id?.courseTitle ||
          "Course unavailable",

        student: {
          id: String(result.student_id?._id || ""),

          name: [
            result.student_id?.firstName,
            result.student_id?.surname,
          ]
            .filter(Boolean)
            .join(" "),

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
      },
    });
  } catch (error) {
    next(error);
  }
};