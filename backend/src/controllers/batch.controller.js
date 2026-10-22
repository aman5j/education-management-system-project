
import mongoose from "mongoose";

import Batch from "../models/Batch.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAssignedStudentCount = (batchId) =>
  Student.countDocuments({ batch_id: batchId });

export const getBatches = async (req, res, next) => {
  try {
    const {
      search = "",
      course_id = "",
      status = "",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (course_id) {
      if (!mongoose.Types.ObjectId.isValid(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      filter.course_id = course_id;
    }

    if (status) {
      if (!["Upcoming", "Ongoing", "Closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch status.",
        });
      }

      filter.status = status;
    }

    if (search.trim()) {
      filter.batch_name = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );
    }

    const allowedSortFields = [
      "batch_name",
      "max_seats",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder = sortOrder === "asc" ? 1 : -1;

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate(
          "course_id",
          "courseTitle courseType courseCategory price mrp"
        )
        .sort({ [safeSortBy]: safeSortOrder })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Batch.countDocuments(filter),
    ]);

    // Calculate assigned student counts for all listed batches in one query.
    const batchIds = batches.map((batch) => batch._id);

    const assignedCounts = batchIds.length
      ? await Student.aggregate([
          {
            $match: {
              batch_id: { $in: batchIds },
            },
          },
          {
            $group: {
              _id: "$batch_id",
              assignedStudents: { $sum: 1 },
            },
          },
        ])
      : [];

    const assignedCountByBatch = new Map(
      assignedCounts.map((item) => [
        String(item._id),
        item.assignedStudents,
      ])
    );

    const batchesWithAccurateSeats = batches.map((batch) => {
      const assignedStudents =
        assignedCountByBatch.get(String(batch._id)) || 0;

      return {
        ...batch,
        available_seats: Math.max(
          Number(batch.max_seats) - assignedStudents,
          0
        ),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        batches: batchesWithAccurateSeats,
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

export const getBatch = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(req.params.id).populate(
      "course_id",
      "courseTitle courseType courseCategory price mrp"
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const assignedStudents = await getAssignedStudentCount(
      batch._id
    );

    const result = batch.toObject();
    result.available_seats = Math.max(
      Number(batch.max_seats) - assignedStudents,
      0
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createBatch = async (req, res, next) => {
  try {
    const { course_id, batch_name, max_seats, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const normalizedName = String(batch_name || "").trim();
    const maximumSeats = Number(max_seats);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Batch name is required.",
      });
    }

    if (!Number.isInteger(maximumSeats) || maximumSeats < 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum seats must be a positive whole number.",
      });
    }

    if (
      status !== undefined &&
      !["Upcoming", "Ongoing", "Closed"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch status.",
      });
    }

    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const escapedName = normalizedName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const existingBatch = await Batch.findOne({
      course_id,
      batch_name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    });

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: "A batch with this name already exists for this course.",
      });
    }

    const batch = await Batch.create({
      course_id,
      batch_name: normalizedName,
      max_seats: maximumSeats,
      available_seats: maximumSeats,
      status,
    });

    const populatedBatch = await Batch.findById(batch._id).populate(
      "course_id",
      "courseTitle courseType courseCategory price mrp"
    );

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      data: populatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBatch = async (req, res, next) => {
  try {
    const { course_id, batch_name, max_seats, status } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const normalizedName = String(batch_name || "").trim();
    const newMaxSeats = Number(max_seats);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Batch name is required.",
      });
    }

    if (!Number.isInteger(newMaxSeats) || newMaxSeats < 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum seats must be a positive whole number.",
      });
    }

    if (
      status !== undefined &&
      !["Upcoming", "Ongoing", "Closed"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch status.",
      });
    }

    const batch = await Batch.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const escapedName = normalizedName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const duplicateBatch = await Batch.findOne({
      _id: { $ne: id },
      course_id,
      batch_name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    });

    if (duplicateBatch) {
      return res.status(409).json({
        success: false,
        message: "A batch with this name already exists for this course.",
      });
    }

    const assignedStudents = await getAssignedStudentCount(batch._id);
    const currentCourseId = String(batch.course_id);
    const newCourseId = String(course._id);

    if (assignedStudents > 0 && currentCourseId !== newCourseId) {
      return res.status(400).json({
        success: false,
        message:
          "This batch cannot be moved to another course while students are assigned to it. Reassign the students first.",
      });
    }

    if (newMaxSeats < assignedStudents) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum seats cannot be less than the number of assigned students (${assignedStudents}).`,
      });
    }

    batch.course_id = course._id;
    batch.batch_name = normalizedName;
    batch.max_seats = newMaxSeats;
    batch.available_seats = newMaxSeats - assignedStudents;

    if (status !== undefined) {
      batch.status = status;
    }

    await batch.save();

    const populatedBatch = await Batch.findById(batch._id).populate(
      "course_id",
      "courseTitle courseType courseCategory price mrp"
    );

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      data: populatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBatch = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    const assignedStudents = await getAssignedStudentCount(batch._id);

    if (assignedStudents > 0) {
      return res.status(400).json({
        success: false,
        message:
          `This batch cannot be deleted because ${assignedStudents} student(s) are assigned to it. Reassign or remove those students first.`,
      });
    }

    await batch.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
