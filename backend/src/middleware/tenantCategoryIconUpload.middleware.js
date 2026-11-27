
import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SIGNATURES = Object.freeze({
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,

  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        137, 80, 78, 71,
        13, 10, 26, 10,
      ])
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
    fields: 10,
    parts: 11,
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

    if (
      !req.tenantUser ||
      !["admin", "staff"].includes(req.tenantUser.role)
    ) {
      return callback(
        createError("TENANT_CATEGORY_ICON_FORBIDDEN")
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(
        createError("TENANT_CATEGORY_ICON_TYPE_INVALID")
      );
    }

    callback(null, true);
  },
});

const uploadSingleIcon = upload.single("categoryIcon");

const tenantCategoryIconUpload = (
  req,
  res,
  next
) => {
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

  if (
    !req.tenantUser ||
    !["admin", "staff"].includes(req.tenantUser.role)
  ) {
    return res.status(403).json({
      success: false,
      code: "TENANT_CATEGORY_ICON_FORBIDDEN",
      message: "You are not authorized to upload category icons.",
    });
  }

  uploadSingleIcon(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const isSizeError =
          error.code === "LIMIT_FILE_SIZE";

        const isCountError =
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE";

        return res.status(400).json({
          success: false,
          code: isSizeError
            ? "TENANT_CATEGORY_ICON_TOO_LARGE"
            : "TENANT_CATEGORY_ICON_UPLOAD_INVALID",
          message: isSizeError
            ? "Category icon must be 5 MB or smaller."
            : isCountError
              ? "Upload only one category icon."
              : "Category icon upload is invalid.",
        });
      }

      const knownErrors = {
        TENANT_CONTEXT_UNAVAILABLE: {
          status: 503,
          message: "Institute context is unavailable.",
        },
        TENANT_CATEGORY_ICON_FORBIDDEN: {
          status: 403,
          message: "You are not authorized to upload category icons.",
        },
        TENANT_CATEGORY_ICON_TYPE_INVALID: {
          status: 400,
          message: "Only JPG, JPEG, PNG and WEBP images are allowed.",
        },
      };

      const known =
        knownErrors[error.code || error.message];

      if (known) {
        return res.status(known.status).json({
          success: false,
          code: error.code || error.message,
          message: known.message,
        });
      }

      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CATEGORY_ICON_REQUIRED",
        message: "Please select a category icon.",
      });
    }

    const signatureValidator =
      SIGNATURES[req.file.mimetype];

    if (
      !signatureValidator ||
      !signatureValidator(req.file.buffer)
    ) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CATEGORY_ICON_CONTENT_INVALID",
        message:
          "The image content does not match its declared file type.",
      });
    }

    return next();
  });
};

export {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  SIGNATURES,
};

export default tenantCategoryIconUpload;
