
import mongoose from "mongoose";
import ExamResult from "../models/ExamResult.js";

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const actorId = (req) => req.user?._id || req.user?.id || null;

const round2 = (value) => Number(Number(value).toFixed(2));

const populateResult = (query) =>
  query
    .populate("student_id", "firstName surname rollNo email")
    .populate("course_id", "courseTitle")
    .populate("exam_id", "totalQuestions totalMarks")
    .lean();

/**
 * GET /api/exam-results/admin/update-marks
 * Lists saved results for the Admin Update Marks screen.
 */
export const getAdminUpdateMarksList = async (req, res, next) => {
  try {
    const results = await populateResult(
      ExamResult.find({})
        .sort({ updatedAt: -1 })
        .limit(1000)
    );

    const search = String(req.query.search || "").trim().toLowerCase();
    const status = String(req.query.status || "All");

    const filtered = results.filter((item) => {
      const student = item.student_id || {};
      const course = item.course_id || {};

      const name = [student.firstName, student.surname]
        .filter(Boolean)
        .join(" ");

      const searchText = [
        name,
        student.rollNo,
        student.email,
        course.courseTitle,
        item.grade,
        item.passStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchText.includes(search);
      const matchesStatus =
        status === "All" || item.resultStatus === status;

      return matchesSearch && matchesStatus;
    });

    return res.json({
      success: true,
      data: {
        results: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exam-results/admin/update-marks/:id
 */
export const getAdminFinalResult = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await populateResult(
      ExamResult.findById(req.params.id)
    );

    if (!result) {
      return fail(res, 404, "Result not found.");
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/exam-results/admin/update-marks/:id
 *
 * Admin directly controls the institute's final marks.
 * Published results can also be updated by Admin.
 */
export const updateAdminFinalResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findById(id);

    if (!result) {
      return fail(res, 404, "Result not found.");
    }

    const {
      objectiveTotalMarks,
      objectiveObtainedMarks,
      practicalTotalMarks,
      practicalObtainedMarks,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      passStatus,
      subjectName,
    } = req.body || {};

    const values = {
      objectiveTotalMarks,
      objectiveObtainedMarks,
      practicalTotalMarks,
      practicalObtainedMarks,
      totalMarks,
      obtainedMarks,
      percentage,
    };

    for (const [key, value] of Object.entries(values)) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        !Number.isFinite(Number(value))
      ) {
        return fail(res, 400, `${key} must be a valid number.`);
      }

      if (Number(value) < 0) {
        return fail(res, 400, `${key} cannot be negative.`);
      }
    }

    const objectiveMax = Number(objectiveTotalMarks);
    const objectiveObtained = Number(objectiveObtainedMarks);
    const practicalMax = Number(practicalTotalMarks);
    const practicalObtained = Number(practicalObtainedMarks);
    const finalTotal = Number(totalMarks);
    const finalObtained = Number(obtainedMarks);
    const finalPercentage = Number(percentage);

    if (objectiveObtained > objectiveMax) {
      return fail(
        res,
        400,
        "Obtained objective marks cannot exceed total objective marks."
      );
    }

    if (practicalObtained > practicalMax) {
      return fail(
        res,
        400,
        "Obtained practical marks cannot exceed total practical marks."
      );
    }

    if (finalObtained > finalTotal || finalTotal <= 0) {
      return fail(
        res,
        400,
        "Final obtained marks cannot exceed the final total marks."
      );
    }

    if (finalPercentage > 100) {
      return fail(res, 400, "Percentage cannot exceed 100.");
    }

    if (typeof grade !== "string" || !grade.trim()) {
      return fail(res, 400, "Please select a grade.");
    }

    if (!["Pass", "Fail"].includes(passStatus)) {
      return fail(res, 400, "Result status must be Pass or Fail.");
    }

    const previousValue = {
      objectiveTotalMarks: result.objectiveTotalMarks,
      objectiveObtainedMarks: result.objectiveObtainedMarks,
      practicalTotalMarks: result.practicalTotalMarks,
      practicalObtainedMarks: result.practicalObtainedMarks,
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      percentage: result.percentage,
      grade: result.grade,
      passStatus: result.passStatus,
    };

    // Preserve the original automatically calculated score once.
    if (result.autoCalculatedMarks === null ||
        result.autoCalculatedMarks === undefined) {
      result.autoCalculatedMarks = result.obtainedMarks;
      result.autoCalculatedPercentage = result.percentage;
    }

    result.objectiveTotalMarks = round2(objectiveMax);
    result.objectiveObtainedMarks = round2(objectiveObtained);
    result.practicalTotalMarks = round2(practicalMax);
    result.practicalObtainedMarks = round2(practicalObtained);

    // Final marks and percentage are Admin-controlled.
    result.totalMarks = round2(finalTotal);
    result.obtainedMarks = round2(finalObtained);
    result.percentage = round2(finalPercentage);
    result.grade = grade.trim();
    result.passStatus = passStatus;

    result.adminMarksUpdatedAt = new Date();
    result.adminMarksUpdatedBy = actorId(req);
    result.updatedBy = actorId(req);

    result.auditHistory.push({
      action: "ADMIN_FINAL_RESULT_UPDATED",
      reason: "Admin updated institute final marks.",
      previousValue,
      newValue: {
        objectiveTotalMarks: result.objectiveTotalMarks,
        objectiveObtainedMarks: result.objectiveObtainedMarks,
        practicalTotalMarks: result.practicalTotalMarks,
        practicalObtainedMarks: result.practicalObtainedMarks,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
        subjectName: String(subjectName || "").trim(),
      },
      changedBy: actorId(req),
    });

    await result.save();

    const updated = await populateResult(
      ExamResult.findById(result._id)
    );

    return res.json({
      success: true,
      message: "Student final result updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(res, 400, error.message);
    }

    next(error);
  }
};
