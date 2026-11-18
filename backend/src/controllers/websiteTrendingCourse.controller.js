
import mongoose from "mongoose";

import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import WebsiteTrendingCourseSettings from "../models/WebsiteTrendingCourseSettings.js";

const getOrCreateSettings = async () => {
  let settings = await WebsiteTrendingCourseSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteTrendingCourseSettings.create({
      key: "default",
      selectedCourseIds: [],
    });
  }

  return settings;
};

const getBatchStatusMap = async (courseIds) => {
  if (!courseIds.length) {
    return new Map();
  }

  const batches = await Batch.find({
    course_id: { $in: courseIds },
  })
    .select("course_id status")
    .lean();

  const statusMap = new Map();

  batches.forEach((batch) => {
    const courseId = String(batch.course_id);

    if (!statusMap.has(courseId)) {
      statusMap.set(courseId, new Set());
    }

    statusMap.get(courseId).add(batch.status);
  });

  const result = new Map();

  statusMap.forEach((statuses, courseId) => {
    let batchStatus = "Not Available";

    // Priority: Ongoing > Upcoming > Closed.
    if (statuses.has("Ongoing")) {
      batchStatus = "Ongoing";
    } else if (statuses.has("Upcoming")) {
      batchStatus = "Upcoming";
    } else if (statuses.has("Closed")) {
      batchStatus = "Closed";
    }

    result.set(courseId, batchStatus);
  });

  return result;
};

const getCourseFields = () =>
  [
    "_id",
    "courseTitle",
    "courseType",
    "courseCategory",
    "courseImage",
    "description",
    "mrp",
    "price",
    "mrpVisible",
    "duration",
    "durationUnit",
    "totalLectures",
    "status",
    "displayOrder",
  ].join(" ");

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

// Admin: get all courses and the current selection.
export const getTrendingCourseSettings = async (
  _req,
  res,
  next
) => {
  try {
    const [settings, courses] = await Promise.all([
      getOrCreateSettings(),

      Course.find({})
        .select(getCourseFields())
        .sort({
          displayOrder: 1,
          courseTitle: 1,
          _id: 1,
        })
        .lean(),
    ]);

    const batchStatusMap = await getBatchStatusMap(
      courses.map((course) => course._id)
    );

    const enrichedCourses = courses.map((course) => ({
      ...course,
      batchStatus:
        batchStatusMap.get(String(course._id)) ||
        "Not Available",
    }));

    return res.status(200).json({
      success: true,
      data: {
        settings,
        courses: enrichedCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: save selected Published course IDs in the chosen order.
export const updateTrendingCourseSettings = async (
  req,
  res,
  next
) => {
  try {
    const selectedCourseIds = req.body?.selectedCourseIds;

    if (!Array.isArray(selectedCourseIds)) {
      return sendError(
        res,
        400,
        "Selected course IDs must be provided as an array."
      );
    }

    if (selectedCourseIds.length > 100) {
      return sendError(
        res,
        400,
        "You cannot select more than 100 trending courses."
      );
    }

    const normalizedIds = selectedCourseIds.map((id) =>
      String(id).trim()
    );

    if (
      normalizedIds.some(
        (id) => !mongoose.isValidObjectId(id)
      )
    ) {
      return sendError(
        res,
        400,
        "One or more selected course IDs are invalid."
      );
    }

    const uniqueIds = [...new Set(normalizedIds)];

    if (uniqueIds.length !== normalizedIds.length) {
      return sendError(
        res,
        400,
        "Duplicate course selections are not allowed."
      );
    }

    if (uniqueIds.length > 0) {
      const publishedCourses = await Course.find({
        _id: { $in: uniqueIds },
        status: "Published",
      })
        .select("_id")
        .lean();

      if (publishedCourses.length !== uniqueIds.length) {
        return sendError(
          res,
          400,
          "One or more selected courses are not Published or no longer exist. Refresh the course list and try again."
        );
      }
    }

    const settings =
      await WebsiteTrendingCourseSettings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            selectedCourseIds: uniqueIds,
            updatedBy: req.user._id,
          },
          $setOnInsert: {
            key: "default",
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message: "Trending courses saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

// Public: only selected Published courses are returned.
export const getPublicTrendingCourses = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    const selectedIds = (
      settings.selectedCourseIds || []
    ).map((id) => String(id));

    if (!selectedIds.length) {
      return res.status(200).json({
        success: true,
        data: { courses: [] },
      });
    }

    const courses = await Course.find({
      _id: { $in: selectedIds },
      status: "Published",
    })
      .select(getCourseFields())
      .lean();

    const batchStatusMap = await getBatchStatusMap(
      courses.map((course) => course._id)
    );

    const courseMap = new Map(
      courses.map((course) => [
        String(course._id),
        {
          ...course,
          batchStatus:
            batchStatusMap.get(String(course._id)) ||
            "Not Available",
        },
      ])
    );

    // Preserve the order saved in Website Editor.
    const orderedCourses = selectedIds
      .map((id) => courseMap.get(id))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: { courses: orderedCourses },
    });
  } catch (error) {
    next(error);
  }
};
