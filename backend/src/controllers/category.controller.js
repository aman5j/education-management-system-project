import Category from "../models/Category.js";

const escapeRegex = (
  value = ""
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

export const getCategories =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        search = "",
        status = "",
        page = 1,
        limit = 10,
        sortBy = "displayOrder",
        sortOrder = "asc",
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

      if (status.trim()) {
        filter.status =
          status.trim();
      }

      if (search.trim()) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              search.trim()
            ),
            "i"
          );

        filter.$or = [
          {
            categoryName:
              searchRegex,
          },
        ];
      }

      const allowedSortFields = [
        "categoryName",
        "displayOrder",
        "status",
        "createdAt",
        "updatedAt",
      ];

      const safeSortBy =
        allowedSortFields.includes(
          sortBy
        )
          ? sortBy
          : "displayOrder";

      const safeSortOrder =
        sortOrder === "desc"
          ? -1
          : 1;

      const [
        categories,
        total,
      ] = await Promise.all([
        Category.find(filter)
          .sort({
            [safeSortBy]:
              safeSortOrder,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Category.countDocuments(
          filter
        ),
      ]);

      const totalPages =
        Math.ceil(
          total / limitNumber
        );

      return res.status(200).json({
        success: true,
        data: {
          categories,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const category =
        await Category.findById(
          req.params.id
        ).lean();

      if (!category) {
        return res.status(404).json({
          success: false,
          message:
            "Category not found.",
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

export const createCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        categoryName,
        displayOrder,
        status,
      } = req.body;

      const normalizedName =
        categoryName
          .trim();

      const existingCategory =
        await Category.findOne({
          categoryName:
            normalizedName,
        });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message:
            "A category with this name already exists.",
        });
      }

      const category =
        await Category.create({
          categoryName:
            normalizedName,

          displayOrder:
            Number(
              displayOrder
            ),

          categoryIcon:
            req.file
              ? `/uploads/categories/${req.file.filename}`
              : "",

          status:
            status.trim(),
        });

      return res.status(201).json({
        success: true,
        message:
          "Category created successfully.",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

export const updateCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const category =
        await Category.findById(
          req.params.id
        );

      if (!category) {
        return res.status(404).json({
          success: false,
          message:
            "Category not found.",
        });
      }

      const {
        categoryName,
        displayOrder,
        status,
      } = req.body;

      if (
        categoryName !==
        undefined
      ) {
        const normalizedName =
          categoryName.trim();

        const duplicateCategory =
          await Category.findOne({
            categoryName:
              normalizedName,
            _id: {
              $ne:
                req.params.id,
            },
          });

        if (duplicateCategory) {
          return res.status(409).json({
            success: false,
            message:
              "A category with this name already exists.",
          });
        }

        category.categoryName =
          normalizedName;
      }

      if (
        displayOrder !==
        undefined
      ) {
        category.displayOrder =
          Number(
            displayOrder
          );
      }

      if (
        status !== undefined
      ) {
        category.status =
          status.trim();
      }

      if (req.file) {
        category.categoryIcon =
          `/uploads/categories/${req.file.filename}`;
      }

      await category.save();

      return res.status(200).json({
        success: true,
        message:
          "Category updated successfully.",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const category =
        await Category.findById(
          req.params.id
        );

      if (!category) {
        return res.status(404).json({
          success: false,
          message:
            "Category not found.",
        });
      }

      await category.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Category deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  };