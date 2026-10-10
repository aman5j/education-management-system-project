
import mongoose from "mongoose";

import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

const validStatuses = ["Present", "Absent", "Late"];

const validateAttendanceRelations = async ({
  student_id,
  course_id,
  batch_id,
}) => {
  if (
    !isValidId(student_id) ||
    !isValidId(course_id) ||
    !isValidId(batch_id)
  ) {
    return "Valid student, course, and batch IDs are required.";
  }

  const [student, course, batch] = await Promise.all([
    Student.findById(student_id).select("_id course_id batch_id"),
    Course.findById(course_id).select("_id"),
    Batch.findById(batch_id).select("_id course_id"),
  ]);

  if (!student) return "Student not found.";
  if (!course) return "Course not found.";
  if (!batch) return "Batch not found.";

  if (String(batch.course_id) !== String(course_id)) {
    return "The selected batch does not belong to this course.";
  }

  if (
    student.course_id &&
    String(student.course_id) !== String(course_id)
  ) {
    return "The selected student does not belong to this course.";
  }

  if (
    student.batch_id &&
    String(student.batch_id) !== String(batch_id)
  ) {
    return "The selected student does not belong to this batch.";
  }

  return null;
};

export const getAttendance = async (req, res, next) => {
  try {
    const {
      date,
      from,
      to,
      course_id,
      batch_id,
      student_id,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (date) {
      const selectedDate = normalizeDate(date);

      if (!selectedDate) {
        return res.status(400).json({
          success: false,
          message: "date must use YYYY-MM-DD format.",
        });
      }

      const nextDate = new Date(selectedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      filter.attendance_date = {
        $gte: selectedDate,
        $lt: nextDate,
      };
    } else if (from || to) {
      const startDate = from ? normalizeDate(from) : null;
      const endDate = to ? normalizeDate(to) : null;

      if ((from && !startDate) || (to && !endDate)) {
        return res.status(400).json({
          success: false,
          message: "from and to must use YYYY-MM-DD format.",
        });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "'from' cannot be later than 'to'.",
        });
      }

      filter.attendance_date = {};

      if (startDate) {
        filter.attendance_date.$gte = startDate;
      }

      if (endDate) {
        const exclusiveEnd = new Date(endDate);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        filter.attendance_date.$lt = exclusiveEnd;
      }
    }

    for (const [key, value] of Object.entries({
      course_id,
      batch_id,
      student_id,
    })) {
      if (value) {
        if (!isValidId(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${key}.`,
          });
        }

        filter[key] = value;
      }
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status.",
        });
      }

      filter.status = status;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate("student_id", "rollNo firstName surname")
        .populate("course_id", "courseTitle")
        .populate("batch_id", "batch_name")
        .populate("marked_by", "name email")
        .sort({ attendance_date: -1, createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      Attendance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createAttendance = async (req, res, next) => {
  try {
    const {
      student_id,
      course_id,
      batch_id,
      attendance_date,
      status = "Present",
      remarks = "",
    } = req.body;

    const normalizedDate = normalizeDate(attendance_date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: "attendance_date must use YYYY-MM-DD format.",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present, Absent, or Late.",
      });
    }

    if (typeof remarks !== "string" || remarks.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Remarks must be a string of at most 500 characters.",
      });
    }

    const relationError = await validateAttendanceRelations({
      student_id,
      course_id,
      batch_id,
    });

    if (relationError) {
      return res.status(400).json({
        success: false,
        message: relationError,
      });
    }

    const record = await Attendance.create({
      student_id,
      course_id,
      batch_id,
      attendance_date: normalizedDate,
      status,
      remarks: remarks.trim(),
      marked_by: req.user._id,
    });

    const populatedRecord = await Attendance.findById(record._id)
      .populate("student_id", "rollNo firstName surname")
      .populate("course_id", "courseTitle")
      .populate("batch_id", "batch_name")
      .populate("marked_by", "name email");

    return res.status(201).json({
      success: true,
      message: "Attendance recorded successfully.",
      data: populatedRecord,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance has already been recorded for this student on this date.",
      });
    }

    next(error);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID.",
      });
    }

    const record = await Attendance.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const { status, remarks } = req.body;

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Present, Absent, or Late.",
        });
      }

      record.status = status;
    }

    if (remarks !== undefined) {
      if (typeof remarks !== "string" || remarks.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Remarks must be a string of at most 500 characters.",
        });
      }

      record.remarks = remarks.trim();
    }

    record.marked_by = req.user._id;

    await record.save();

    const updatedRecord = await Attendance.findById(record._id)
      .populate("student_id", "rollNo firstName surname")
      .populate("course_id", "courseTitle")
      .populate("batch_id", "batch_name")
      .populate("marked_by", "name email");

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      data: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};
