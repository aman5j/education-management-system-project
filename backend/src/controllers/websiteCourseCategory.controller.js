
import mongoose from "mongoose";

import Category from "../models/Category.js";
import WebsiteCourseCategorySettings from "../models/WebsiteCourseCategorySettings.js";

const getOrCreateSettings = async () => {
  let settings = await WebsiteCourseCategorySettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteCourseCategorySettings.create({
      key: "default",
      selectedCategoryIds: [],
    });
  }

  return settings;
};

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

// Admin: fetch all existing categories and saved selections.
export const getWebsiteCourseCategorySettings = async (
  _req,
  res,
  next
) => {
  try {
    const [settings, categories] = await Promise.all([
      getOrCreateSettings(),

      Category.find({})
        .select(
          "_id categoryName categoryIcon displayOrder status"
        )
        .collation({ locale: "en", strength: 2 })
        .sort({ displayOrder: 1, categoryName: 1, _id: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        settings,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: save selected category IDs.
export const updateWebsiteCourseCategorySettings = async (
  req,
  res,
  next
) => {
  try {
    const selectedCategoryIds = req.body?.selectedCategoryIds;

    if (!Array.isArray(selectedCategoryIds)) {
      return sendError(
        res,
        400,
        "Selected category IDs must be provided as an array."
      );
    }

    if (selectedCategoryIds.length > 500) {
      return sendError(
        res,
        400,
        "You cannot select more than 500 categories."
      );
    }

    const normalizedIds = selectedCategoryIds.map((id) =>
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
        "One or more selected category IDs are invalid."
      );
    }

    const uniqueIds = [...new Set(normalizedIds)];

    if (uniqueIds.length !== normalizedIds.length) {
      return sendError(
        res,
        400,
        "Duplicate category selections are not allowed."
      );
    }

    // Only existing Active categories can be saved.
    const activeCategories = await Category.find({
      _id: { $in: uniqueIds },
      status: "Active",
    })
      .select("_id")
      .lean();

    if (activeCategories.length !== uniqueIds.length) {
      return sendError(
        res,
        400,
        "One or more selected categories are inactive or no longer exist. Refresh the category list and try again."
      );
    }

    const settings =
      await WebsiteCourseCategorySettings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            selectedCategoryIds: uniqueIds,
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
      message: "Course categories saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return selected Active categories only.
export const getPublicWebsiteCourseCategories = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    const selectedIds = (
      settings.selectedCategoryIds || []
    ).map((id) => String(id));

    if (!selectedIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          categories: [],
        },
      });
    }

    const categories = await Category.find({
      _id: { $in: selectedIds },
      status: "Active",
    })
      .select(
        "_id categoryName categoryIcon displayOrder status"
      )
      .lean();

    // Preserve the exact order selected in Website Editor.
    const categoryMap = new Map(
      categories.map((category) => [
        String(category._id),
        category,
      ])
    );

    const orderedCategories = selectedIds
      .map((id) => categoryMap.get(id))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        categories: orderedCategories,
      },
    });
  } catch (error) {
    next(error);
  }
};
