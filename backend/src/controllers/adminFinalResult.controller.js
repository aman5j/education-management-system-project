
import mongoose from "mongoose";
import ExamResult from "../models/ExamResult.js";
import Exam from "../models/Exam.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const actorId = (req) => req.user?._id || req.user?.id || null;
const round2 = (value) => Number(Number(value).toFixed(2));

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
    .populate("student_id", "firstName surname rollNo email")
    .populate("course_id", "courseTitle")
    .populate("exam_id", "totalQuestions totalMarks marksPerQuestion");

export const getAdminUpdateMarksList = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "All");

    const filter = { attemptStatus: "Submitted" };

    if (["Draft", "Published"].includes(status)) {
      filter.resultStatus = status;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const [students, courses] = await Promise.all([
        Student.find({
          $or: [
            { firstName: regex },
            { surname: regex },
            { rollNo: regex },
            { email: regex },
          ],
        }).select("_id").lean(),
        Course.find({ courseTitle: regex }).select("_id").lean(),
      ]);

      filter.$or = [
        { student_id: { $in: students.map((s) => s._id) } },
        { course_id: { $in: courses.map((c) => c._id) } },
      ];
    }

    const [results, total] = await Promise.all([
      populateResult(
        ExamResult.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
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

export const getAdminFinalResult = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await populateResult(
      ExamResult.findById(req.params.id)
    ).lean();

    if (!result) return fail(res, 404, "Result not found.");

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/exam-results/admin/update-marks/:id
 * Admin may submit ONLY obtainedMarks.
 */
export const updateAdminFinalResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(id);

    if (!result) return fail(res, 404, "Result not found.");

    if (result.resultStatus === "Published") {
      return fail(
        res,
        409,
        "This result is published. Obtained marks can no longer be changed."
      );
    }

    if (result.attemptStatus !== "Submitted") {
      return fail(
        res,
        409,
        "Marks can only be updated after the student submits the exam."
      );
    }

    const rawMarks = req.body?.obtainedMarks;

    if (
      rawMarks === undefined ||
      rawMarks === null ||
      rawMarks === "" ||
      !Number.isFinite(Number(rawMarks))
    ) {
      return fail(res, 400, "Enter valid obtained marks.");
    }

    const obtainedMarks = round2(rawMarks);
    const exam = await Exam.findById(result.exam_id).select("totalMarks");

    if (!exam) return fail(res, 404, "The linked exam was not found.");

    const totalMarks = Number(exam.totalMarks);

    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      return fail(res, 409, "The exam has an invalid total marks configuration.");
    }

    if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return fail(
        res,
        400,
        `Obtained marks must be between 0 and ${totalMarks}.`
      );
    }

    const previousValue = {
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      percentage: result.percentage,
      grade: result.grade,
      passStatus: result.passStatus,
    };

    const percentage = round2((obtainedMarks / totalMarks) * 100);

    result.totalMarks = totalMarks;
    result.obtainedMarks = obtainedMarks;
    result.percentage = percentage;
    result.grade = getGrade(percentage);
    result.passStatus = percentage >= 40 ? "Pass" : "Fail";
    result.adminMarksUpdatedAt = new Date();
    result.adminMarksUpdatedBy = actorId(req);
    result.updatedBy = actorId(req);

    result.auditHistory.push({
      action: "ADMIN_FINAL_RESULT_UPDATED",
      reason: "Admin updated the student's obtained marks.",
      previousValue,
      newValue: {
        totalMarks,
        obtainedMarks,
        percentage,
        grade: result.grade,
        passStatus: result.passStatus,
      },
      changedBy: actorId(req),
    });

    await result.save();

    const updated = await populateResult(
      ExamResult.findById(result._id)
    ).lean();

    return res.json({
      success: true,
      message: "Obtained marks updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(res, 400, error.message);
    }
    next(error);
  }
};

/**
 * PATCH /api/exam-results/admin/update-marks/:id/publish
 */
export const publishAdminFinalResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(id);

    if (!result) return fail(res, 404, "Result not found.");

    if (result.resultStatus === "Published") {
      return fail(res, 409, "This result is already published.");
    }

    if (result.attemptStatus !== "Submitted") {
      return fail(
        res,
        409,
        "The student must submit the exam before the result can be published."
      );
    }

    const exam = await Exam.findById(result.exam_id).select("totalMarks");

    if (!exam || Number(exam.totalMarks) <= 0) {
      return fail(res, 409, "The linked exam has an invalid total marks configuration.");
    }

    const totalMarks = Number(exam.totalMarks);
    const obtainedMarks = Number(result.obtainedMarks);

    if (
      !Number.isFinite(obtainedMarks) ||
      obtainedMarks < 0 ||
      obtainedMarks > totalMarks
    ) {
      return fail(res, 409, "Correct the obtained marks before publishing.");
    }

    const percentage = round2((obtainedMarks / totalMarks) * 100);

    result.totalMarks = totalMarks;
    result.percentage = percentage;
    result.grade = getGrade(percentage);
    result.passStatus = percentage >= 40 ? "Pass" : "Fail";
    result.resultStatus = "Published";
    result.publishedAt = new Date();
    result.updatedBy = actorId(req);

    await result.save();

    const updated = await populateResult(
      ExamResult.findById(result._id)
    ).lean();

    return res.json({
      success: true,
      message: "Student result published successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
