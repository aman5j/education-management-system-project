
import Category from "../models/Category.js";
import Course from "../models/Course.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidStatus = (status) =>
  ["Active", "Inactive"].includes(status);

const sendDuplicateNameError = (res) =>
  res.status(409).json({
    success: false,
    message: "A category with this name already exists.",
  });

export const getCategories = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      page = 1,
      limit = 10,
      sortBy = "displayOrder",
      sortOrder = "asc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (typeof status === "string" && status.trim()) {
      if (!isValidStatus(status.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid category status.",
        });
      }

      filter.status = status.trim();
    }

    if (typeof search === "string" && search.trim()) {
      filter.categoryName = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    const allowedSortFields = [
      "categoryName",
      "displayOrder",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "displayOrder";

    const safeSortOrder = sortOrder === "desc" ? -1 : 1;

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .collation({ locale: "en", strength: 2 })
        .sort({ [safeSortBy]: safeSortOrder, _id: 1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Category.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        categories,
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

export const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const categoryName =
      typeof req.body.categoryName === "string"
        ? req.body.categoryName.trim()
        : "";

    const displayOrder = Number(req.body.displayOrder);
    const status = req.body.status;

    if (categoryName.length < 2 || categoryName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Category name must be between 2 and 100 characters.",
      });
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "Display order must be a whole number of 0 or greater.",
      });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Category status must be Active or Inactive.",
      });
    }

    const existingCategory = await Category.findOne({
      categoryName: {
        $regex: `^${escapeRegex(categoryName)}$`,
        $options: "i",
      },
    });

    if (existingCategory) {
      return sendDuplicateNameError(res);
    }

    const category = await Category.create({
      categoryName,
      displayOrder,
      categoryIcon: req.file
        ? `/uploads/categories/${req.file.filename}`
        : "",
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendDuplicateNameError(res);
    }

    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const {
      categoryName,
      displayOrder,
      status,
    } = req.body;

    if (categoryName !== undefined) {
      if (typeof categoryName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Category name must be text.",
        });
      }

      const normalizedName = categoryName.trim();

      if (normalizedName.length < 2 || normalizedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Category name must be between 2 and 100 characters.",
        });
      }

      // Course currently stores category names as strings.
      // Prevent renaming a category while courses still reference its old name.
      const isActualRename =
        normalizedName.toLowerCase() !==
        category.categoryName.trim().toLowerCase();

      if (isActualRename) {
        const categoryNameRegex = new RegExp(
          `^${escapeRegex(category.categoryName.trim())}$`,
          "i"
        );

        const coursesUsingCategory = await Course.countDocuments({
          courseCategory: categoryNameRegex,
        });

        if (coursesUsingCategory > 0) {
          return res.status(409).json({
            success: false,
            message:
              `Cannot rename "${category.categoryName}" because ` +
              `${coursesUsingCategory} course(s) use it. ` +
              "Reassign those courses first.",
            data: { coursesUsingCategory },
          });
        }
      }

      const duplicateCategory = await Category.findOne({
        _id: { $ne: category._id },
        categoryName: {
          $regex: `^${escapeRegex(normalizedName)}$`,
          $options: "i",
        },
      });

      if (duplicateCategory) {
        return sendDuplicateNameError(res);
      }

      category.categoryName = normalizedName;
    }

    if (displayOrder !== undefined) {
      const normalizedOrder = Number(displayOrder);

      if (!Number.isInteger(normalizedOrder) || normalizedOrder < 0) {
        return res.status(400).json({
          success: false,
          message: "Display order must be a whole number of 0 or greater.",
        });
      }

      category.displayOrder = normalizedOrder;
    }

    if (status !== undefined) {
      if (!isValidStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Category status must be Active or Inactive.",
        });
      }

      category.status = status;
    }

    if (req.file) {
      category.categoryIcon = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendDuplicateNameError(res);
    }

    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    // Course currently stores the category name as a string.
    // Match case-insensitively so capitalization cannot bypass this check.
    const categoryNameRegex = new RegExp(
      `^${escapeRegex(category.categoryName.trim())}$`,
      "i"
    );

    const coursesUsingCategory = await Course.countDocuments({
      courseCategory: categoryNameRegex,
    });

    if (coursesUsingCategory > 0) {
      return res.status(409).json({
        success: false,
        message:
          `Cannot delete "${category.categoryName}" because ${coursesUsingCategory} course(s) use it. ` +
          "Reassign those courses or mark this category Inactive instead.",
        data: {
          coursesUsingCategory,
        },
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
