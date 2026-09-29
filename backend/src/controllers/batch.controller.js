import mongoose from "mongoose";

import Batch from "../models/Batch.js";
import Course from "../models/Course.js";

const escapeRegex = (
  value = ""
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

export const getBatches =
  async (
    req,
    res,
    next
  ) => {
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

      const pageNumber = Math.max(
        Number(page) || 1,
        1
      );

      const limitNumber = Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const filter = {};

      if (course_id) {
        if (
          !mongoose.Types.ObjectId.isValid(
            course_id
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid course ID.",
          });
        }

        filter.course_id =
          course_id;
      }

      if (status) {
        filter.status =
          status;
      }

      if (search.trim()) {
        filter.batch_name =
          new RegExp(
            escapeRegex(
              search.trim()
            ),
            "i"
          );
      }

      const allowedSortFields = [
        "batch_name",
        "max_seats",
        "available_seats",
        "status",
        "createdAt",
        "updatedAt",
      ];

      const safeSortBy =
        allowedSortFields.includes(
          sortBy
        )
          ? sortBy
          : "createdAt";

      const safeSortOrder =
        sortOrder === "asc"
          ? 1
          : -1;

      const [
        batches,
        total,
      ] = await Promise.all([
        Batch.find(filter)
          .populate(
            "course_id",
            "courseTitle courseType courseCategory price mrp"
          )
          .sort({
            [safeSortBy]:
              safeSortOrder,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Batch.countDocuments(
          filter
        ),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          batches,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages:
              Math.ceil(
                total /
                  limitNumber
              ),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getBatch =
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID.",
        });
      }

      const batch =
        await Batch.findById(
          req.params.id
        ).populate(
          "course_id",
          "courseTitle courseType courseCategory price mrp"
        );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message:
            "Batch not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  };

export const createBatch =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        course_id,
        batch_name,
        max_seats,
        status,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          course_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course ID.",
        });
      }

      const course =
        await Course.findById(
          course_id
        );

      if (!course) {
        return res.status(404).json({
          success: false,
          message:
            "Course not found.",
        });
      }

      const existingBatch =
        await Batch.findOne({
          course_id,
          batch_name:
            batch_name.trim(),
        });

      if (existingBatch) {
        return res.status(409).json({
          success: false,
          message:
            "A batch with this name already exists for this course.",
        });
      }

      const maximumSeats =
        Number(max_seats);

      const batch =
        await Batch.create({
          course_id,
          batch_name:
            batch_name.trim(),
          max_seats:
            maximumSeats,

          // New batch starts with
          // all seats available.
          available_seats:
            maximumSeats,

          status,
        });

      const populatedBatch =
        await Batch.findById(
          batch._id
        ).populate(
          "course_id",
          "courseTitle courseType courseCategory price mrp"
        );

      return res.status(201).json({
        success: true,
        message:
          "Batch created successfully.",
        data: populatedBatch,
      });
    } catch (error) {
      next(error);
    }
  };

export const updateBatch =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        course_id,
        batch_name,
        max_seats,
        status,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          course_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course ID.",
        });
      }

      const batch =
        await Batch.findById(
          req.params.id
        );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message:
            "Batch not found.",
        });
      }

      const course =
        await Course.findById(
          course_id
        );

      if (!course) {
        return res.status(404).json({
          success: false,
          message:
            "Course not found.",
        });
      }

      const duplicateBatch =
        await Batch.findOne({
          _id: {
            $ne:
              req.params.id,
          },
          course_id,
          batch_name:
            batch_name.trim(),
        });

      if (duplicateBatch) {
        return res.status(409).json({
          success: false,
          message:
            "A batch with this name already exists for this course.",
        });
      }

      const newMaxSeats =
        Number(max_seats);

      /*
       * Calculate occupied seats
       * from the previous values.
       *
       * Example:
       * max = 30
       * available = 22
       * occupied = 8
       *
       * New max = 40
       * available = 32
       */
      const occupiedSeats =
        Math.max(
          batch.max_seats -
            batch.available_seats,
          0
        );

      if (
        newMaxSeats <
        occupiedSeats
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Maximum seats cannot be less than currently occupied seats (${occupiedSeats}).`,
        });
      }

      const newAvailableSeats =
        newMaxSeats -
        occupiedSeats;

      batch.course_id =
        course_id;

      batch.batch_name =
        batch_name.trim();

      batch.max_seats =
        newMaxSeats;

      batch.available_seats =
        newAvailableSeats;

      batch.status =
        status;

      await batch.save();

      const populatedBatch =
        await Batch.findById(
          batch._id
        ).populate(
          "course_id",
          "courseTitle courseType courseCategory price mrp"
        );

      return res.status(200).json({
        success: true,
        message:
          "Batch updated successfully.",
        data: populatedBatch,
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteBatch =
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID.",
        });
      }

      const batch =
        await Batch.findById(
          req.params.id
        );

      if (!batch) {
        return res.status(404).json({
          success: false,
          message:
            "Batch not found.",
        });
      }

      const occupiedSeats =
        batch.max_seats -
        batch.available_seats;

      if (occupiedSeats > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Batch cannot be deleted because students are assigned to this batch.",
        });
      }

      await batch.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Batch deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  };