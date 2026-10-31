import mongoose from "mongoose";

import ExamResult from "../models/ExamResult.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (value) =>
  mongoose.isValidObjectId(value);

/*
|--------------------------------------------------------------------------
| Get Single Exam Result
|--------------------------------------------------------------------------
| GET /api/exam-results/:id
|
| Retained for compatibility with existing Admin consumers.
| Student exam submission and result viewing are handled by
| studentExam.controller.js and studentPortal.routes.js.
|--------------------------------------------------------------------------
*/

export const getExamResultById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(id)
      .populate(
        "exam_id",
        "course_id totalQuestions totalMarks marksPerQuestion"
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

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};