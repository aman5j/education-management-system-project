
import mongoose from "mongoose";

import tenantCategoryIconService from "../services/tenantCategoryIcon.service.js";

const sendError = (res, status, code, message) =>
  res.status(status).json({
    success: false,
    code,
    message,
  });

const getCategoryModel = (req) => {
  if (typeof req.getTenantModel !== "function") {
    throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
  }

  return req.getTenantModel("Category");
};

const getTenantContext = (req) => {
  if (
    !req.tenantContext?.instituteId ||
    !req.tenantContext?.collectionPrefix
  ) {
    throw new Error("TENANT_CONTEXT_UNAVAILABLE");
  }

  return req.tenantContext;
};

const getCategory = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return { invalid: true };
  }

  const Category = getCategoryModel(req);
  const category = await Category.findById(req.params.id);

  return { category };
};

const isManagedIconName = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
    value
  );

const cleanupNewIcon = async (tenantContext, fileName) => {
  if (!isManagedIconName(fileName)) return;

  try {
    await tenantCategoryIconService.deleteIcon(
      tenantContext,
      fileName
    );
  } catch (error) {
    console.error(
      "Tenant category icon cleanup failed:",
      error.message
    );
  }
};

const cleanupOldIcon = async (tenantContext, fileName) => {
  // Never delete a legacy shared-upload path.
  if (!isManagedIconName(fileName)) return;

  try {
    await tenantCategoryIconService.deleteIcon(
      tenantContext,
      fileName
    );
  } catch (error) {
    // The category update has already succeeded.
    // Keep the database change and log cleanup for later.
    console.error(
      "Old tenant category icon cleanup failed:",
      error.message
    );
  }
};

/**
 * POST /api/tenant/categories/:id/icon
 *
 * Upload or replace a category icon.
 * Multipart field: categoryIcon
 */
export const uploadTenantCategoryIcon = async (
  req,
  res,
  next
) => {
  let savedIcon = null;

  try {
    if (!req.file?.buffer) {
      return sendError(
        res,
        400,
        "TENANT_CATEGORY_ICON_REQUIRED",
        "Please select a category icon."
      );
    }

    const result = await getCategory(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_CATEGORY_ID_INVALID",
        "Invalid category ID."
      );
    }

    if (!result.category) {
      return sendError(
        res,
        404,
        "TENANT_CATEGORY_NOT_FOUND",
        "Category not found."
      );
    }

    const tenantContext = getTenantContext(req);

    savedIcon = await tenantCategoryIconService.saveIcon(
      tenantContext,
      req.file.buffer,
      req.file.mimetype
    );

    const previousIcon = result.category.categoryIcon;

    // Store only the server-generated filename.
    // Never store a browser-supplied path or URL.
    result.category.categoryIcon = savedIcon.fileName;

    try {
      await result.category.save();
    } catch (databaseError) {
      await cleanupNewIcon(
        tenantContext,
        savedIcon.fileName
      );

      savedIcon = null;
      throw databaseError;
    }

    // The new icon is now referenced by the category.
    // Remove the previous managed icon only after save succeeds.
    await cleanupOldIcon(
      tenantContext,
      previousIcon
    );

    const response = {
      ...result.category.toObject(),
      categoryIconUrl:
        `/api/tenant/categories/${result.category._id}/icon`,
    };

    return res.status(200).json({
      success: true,
      message: "Category icon uploaded successfully.",
      data: {
        category: response,
      },
    });
  } catch (error) {
    if (savedIcon) {
      await cleanupNewIcon(
        req.tenantContext,
        savedIcon.fileName
      );
    }

    return next(error);
  }
};

/**
 * GET /api/tenant/categories/:id/icon
 *
 * Retrieves only the icon belonging to the current tenant.
 */
export const getTenantCategoryIcon = async (
  req,
  res,
  next
) => {
  try {
    const result = await getCategory(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_CATEGORY_ID_INVALID",
        "Invalid category ID."
      );
    }

    if (!result.category) {
      return sendError(
        res,
        404,
        "TENANT_CATEGORY_NOT_FOUND",
        "Category not found."
      );
    }

    const fileName = result.category.categoryIcon;

    if (!isManagedIconName(fileName)) {
      return sendError(
        res,
        404,
        "TENANT_CATEGORY_ICON_NOT_FOUND",
        "Category icon not found."
      );
    }

    const icon = await tenantCategoryIconService.readIcon(
      getTenantContext(req),
      fileName
    );

    if (!icon) {
      return sendError(
        res,
        404,
        "TENANT_CATEGORY_ICON_NOT_FOUND",
        "Category icon file not found."
      );
    }

    res.set({
      "Content-Type": icon.mimeType,
      "Content-Length": String(icon.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });

    return res.sendFile(icon.path);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/tenant/categories/:id/icon
 *
 * Removes the category icon without deleting the category.
 */
export const deleteTenantCategoryIcon = async (
  req,
  res,
  next
) => {
  try {
    const result = await getCategory(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_CATEGORY_ID_INVALID",
        "Invalid category ID."
      );
    }

    if (!result.category) {
      return sendError(
        res,
        404,
        "TENANT_CATEGORY_NOT_FOUND",
        "Category not found."
      );
    }

    const tenantContext = getTenantContext(req);
    const previousIcon = result.category.categoryIcon;

    if (!previousIcon) {
      return res.status(200).json({
        success: true,
        message: "Category has no icon to remove.",
      });
    }

    // Remove the database reference first.
    result.category.categoryIcon = "";

    await result.category.save();

    // Delete only server-managed tenant icon files.
    // Legacy shared-upload paths are intentionally untouched.
    await cleanupOldIcon(
      tenantContext,
      previousIcon
    );

    return res.status(200).json({
      success: true,
      message: "Category icon removed successfully.",
      data: {
        categoryId: result.category._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};
