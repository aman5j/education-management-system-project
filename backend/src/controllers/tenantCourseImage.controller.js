
import mongoose from "mongoose";

import tenantCourseImageService from "../services/tenantCourseImage.service.js";

const MANAGED_IMAGE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const sendError = (res, status, code, message) =>
  res.status(status).json({
    success: false,
    code,
    message,
  });

const getTenantContext = (req) => {
  if (
    !req.tenantContext?.instituteId ||
    !req.tenantContext?.collectionPrefix
  ) {
    throw new Error("TENANT_CONTEXT_UNAVAILABLE");
  }

  return req.tenantContext;
};

const getCourseModel = (req) => {
  if (typeof req.getTenantModel !== "function") {
    throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
  }

  return req.getTenantModel("Course");
};

const getCourse = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return { invalid: true };
  }

  const Course = getCourseModel(req);
  const course = await Course.findById(req.params.id);

  return { course };
};

const isManagedImage = (value) =>
  typeof value === "string" &&
  MANAGED_IMAGE_PATTERN.test(value) &&
  value === value.split(/[\\/]/).pop();

const cleanupImage = async (context, fileName) => {
  if (!isManagedImage(fileName)) return;

  try {
    await tenantCourseImageService.deleteImage(
      context,
      fileName
    );
  } catch (error) {
    console.error(
      "Tenant Course image cleanup failed:",
      error.message
    );
  }
};

const getImageUrl = (courseId) =>
  `/api/tenant/courses/${courseId}/image`;

export const uploadTenantCourseImage = async (
  req,
  res,
  next
) => {
  let savedImage = null;

  try {
    if (!req.file?.buffer) {
      return sendError(
        res,
        400,
        "TENANT_COURSE_IMAGE_REQUIRED",
        "Please select a Course image."
      );
    }

    const result = await getCourse(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_COURSE_ID_INVALID",
        "Invalid Course ID."
      );
    }

    if (!result.course) {
      return sendError(
        res,
        404,
        "TENANT_COURSE_NOT_FOUND",
        "Course not found."
      );
    }

    const context = getTenantContext(req);
    const previousImage = result.course.courseImage || "";

    savedImage = await tenantCourseImageService.saveImage(
      context,
      req.file.buffer,
      req.file.mimetype
    );

    // Save the generated filename only.
    result.course.courseImage = savedImage.fileName;

    try {
      await result.course.save();
    } catch (databaseError) {
      result.course.courseImage = previousImage;

      await cleanupImage(context, savedImage.fileName);
      savedImage = null;

      throw databaseError;
    }

    // Never delete old legacy shared-upload images.
    await cleanupImage(context, previousImage);

    return res.status(200).json({
      success: true,
      message: "Course image uploaded successfully.",
      data: {
        courseId: result.course._id,
        courseImage: savedImage.fileName,
        courseImageUrl: getImageUrl(result.course._id),
      },
    });
  } catch (error) {
    if (savedImage) {
      await cleanupImage(
        req.tenantContext,
        savedImage.fileName
      );
    }

    return next(error);
  }
};

export const getTenantCourseImage = async (
  req,
  res,
  next
) => {
  try {
    const result = await getCourse(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_COURSE_ID_INVALID",
        "Invalid Course ID."
      );
    }

    if (!result.course) {
      return sendError(
        res,
        404,
        "TENANT_COURSE_NOT_FOUND",
        "Course not found."
      );
    }

    const fileName = result.course.courseImage;

    // Do not expose legacy shared-upload images through this
    // private tenant image endpoint.
    if (!isManagedImage(fileName)) {
      return sendError(
        res,
        404,
        "TENANT_COURSE_IMAGE_NOT_FOUND",
        "Private Course image not found."
      );
    }

    const image = await tenantCourseImageService.readImage(
      getTenantContext(req),
      fileName
    );

    if (!image) {
      return sendError(
        res,
        404,
        "TENANT_COURSE_IMAGE_NOT_FOUND",
        "Course image file not found."
      );
    }

    res.set({
      "Content-Type": image.mimeType,
      "Content-Length": String(image.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });

    return res.sendFile(image.path);
  } catch (error) {
    return next(error);
  }
};

export const deleteTenantCourseImage = async (
  req,
  res,
  next
) => {
  try {
    const result = await getCourse(req);

    if (result.invalid) {
      return sendError(
        res,
        400,
        "TENANT_COURSE_ID_INVALID",
        "Invalid Course ID."
      );
    }

    if (!result.course) {
      return sendError(
        res,
        404,
        "TENANT_COURSE_NOT_FOUND",
        "Course not found."
      );
    }

    const previousImage = result.course.courseImage || "";

    if (!previousImage) {
      return res.status(200).json({
        success: true,
        message: "Course has no image to remove.",
      });
    }

    // Do not clear or delete legacy image references.
    if (!isManagedImage(previousImage)) {
      return sendError(
        res,
        409,
        "LEGACY_COURSE_IMAGE_PROTECTED",
        "This is a legacy shared-upload image. It has not been modified."
      );
    }

    const context = getTenantContext(req);

    // Clear database reference first.
    result.course.courseImage = "";

    await result.course.save();

    // Delete only the managed tenant image.
    await cleanupImage(context, previousImage);

    return res.status(200).json({
      success: true,
      message: "Course image removed successfully.",
      data: {
        courseId: result.course._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};
