
import multer from "multer";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SIGNATURES = Object.freeze({
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,

  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    ),

  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP",
});

const createError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 5,
    parts: 6,
  },

  fileFilter: (req, file, callback) => {
    if (
      !req.tenantContext?.instituteId ||
      !req.tenantContext?.collectionPrefix
    ) {
      return callback(
        createError("TENANT_CONTEXT_UNAVAILABLE")
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(
        createError("TENANT_COURSE_IMAGE_TYPE_INVALID")
      );
    }

    callback(null, true);
  },
});

const uploadSingle = upload.single("courseImage");

const tenantCourseImageUpload = (req, res, next) => {
  if (
    !req.tenantContext?.instituteId ||
    !req.tenantContext?.collectionPrefix
  ) {
    return res.status(503).json({
      success: false,
      code: "TENANT_CONTEXT_UNAVAILABLE",
      message: "Institute context is unavailable.",
    });
  }

  uploadSingle(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === "LIMIT_FILE_SIZE";

        return res.status(400).json({
          success: false,
          code: tooLarge
            ? "TENANT_COURSE_IMAGE_TOO_LARGE"
            : "TENANT_COURSE_IMAGE_UPLOAD_INVALID",
          message: tooLarge
            ? "Course image must be 5 MB or smaller."
            : "Upload only one Course image.",
        });
      }

      const messages = {
        TENANT_CONTEXT_UNAVAILABLE: [
          503,
          "Institute context is unavailable.",
        ],
        TENANT_COURSE_IMAGE_TYPE_INVALID: [
          400,
          "Only JPG, PNG and WEBP images are allowed.",
        ],
      };

      const known = messages[error.code || error.message];

      if (known) {
        return res.status(known[0]).json({
          success: false,
          code: error.code || error.message,
          message: known[1],
        });
      }

      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "TENANT_COURSE_IMAGE_REQUIRED",
        message: "Please select a Course image.",
      });
    }

    const validateSignature = SIGNATURES[req.file.mimetype];

    if (
      !validateSignature ||
      !validateSignature(req.file.buffer)
    ) {
      return res.status(400).json({
        success: false,
        code: "TENANT_COURSE_IMAGE_CONTENT_INVALID",
        message: "Image content does not match its declared file type.",
      });
    }

    return next();
  });
};

export default tenantCourseImageUpload;
