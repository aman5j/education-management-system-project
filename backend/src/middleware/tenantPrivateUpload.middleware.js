
import multer from "multer";

import tenantFileStorage from "../services/tenantFileStorage.js";

const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const tenantPrivateUpload = ({
  fieldName = "document",
  allowedMimeTypes = DEFAULT_ALLOWED_TYPES,
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 1,
} = {}) => {
  if (
    typeof fieldName !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldName)
  ) {
    throw new Error("TENANT_UPLOAD_FIELD_INVALID");
  }

  if (
    !Array.isArray(allowedMimeTypes) ||
    allowedMimeTypes.length === 0
  ) {
    throw new Error("TENANT_UPLOAD_TYPES_INVALID");
  }

  if (
    !Number.isInteger(maxFileSize) ||
    maxFileSize < 1
  ) {
    throw new Error("TENANT_UPLOAD_SIZE_INVALID");
  }

  if (
    !Number.isInteger(maxFiles) ||
    maxFiles < 1 ||
    maxFiles > 10
  ) {
    throw new Error("TENANT_UPLOAD_COUNT_INVALID");
  }

  const allowedTypes = new Set(allowedMimeTypes);

  for (const mimeType of allowedTypes) {
    if (
      typeof mimeType !== "string" ||
      !tenantFileStorage.createFileName
    ) {
      throw new Error("TENANT_UPLOAD_TYPES_INVALID");
    }

    // Validate the MIME type against the storage service's
    // supported extension mapping.
    tenantFileStorage.createFileName(mimeType);
  }

  const storage = multer.diskStorage({
    destination: async (req, file, callback) => {
      try {
        if (!req.tenantContext) {
          return callback(
            new Error("TENANT_FILE_CONTEXT_MISSING")
          );
        }

        const directory =
          await tenantFileStorage.ensureTenantDirectory(
            req.tenantContext
          );

        callback(null, directory);
      } catch (error) {
        callback(error);
      }
    },

    filename: (req, file, callback) => {
      try {
        if (!req.tenantContext) {
          return callback(
            new Error("TENANT_FILE_CONTEXT_MISSING")
          );
        }

        const fileName =
          tenantFileStorage.createFileName(
            file.mimetype
          );

        callback(null, fileName);
      } catch (error) {
        callback(error);
      }
    },
  });

  const upload = multer({
    storage,

    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: 30,
      parts: maxFiles + 30,
    },

    fileFilter: (req, file, callback) => {
      if (!req.tenantContext) {
        return callback(
          new Error("TENANT_FILE_CONTEXT_MISSING")
        );
      }

      if (!allowedTypes.has(file.mimetype)) {
        return callback(
          new Error("TENANT_FILE_TYPE_NOT_ALLOWED")
        );
      }

      callback(null, true);
    },
  });

  const uploadHandler =
    maxFiles === 1
      ? upload.single(fieldName)
      : upload.array(fieldName, maxFiles);

  return (req, res, next) => {
    uploadHandler(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        const isSizeError =
          error.code === "LIMIT_FILE_SIZE";

        return res.status(400).json({
          success: false,
          code: isSizeError
            ? "TENANT_FILE_TOO_LARGE"
            : "TENANT_UPLOAD_INVALID",
          message: isSizeError
            ? "The uploaded file exceeds the allowed size."
            : "The file upload could not be completed.",
        });
      }

      const knownErrors = {
        TENANT_FILE_CONTEXT_MISSING: {
          status: 503,
          message: "Institute file storage is unavailable.",
        },
        TENANT_FILE_CONTEXT_INVALID: {
          status: 503,
          message: "Institute file storage context is invalid.",
        },
        TENANT_FILE_PREFIX_INVALID: {
          status: 503,
          message: "Institute file storage context is invalid.",
        },
        TENANT_FILE_TYPE_NOT_ALLOWED: {
          status: 400,
          message: "This file type is not allowed.",
        },
      };

      const known = knownErrors[error.message];

      if (known) {
        return res.status(known.status).json({
          success: false,
          code: error.message,
          message: known.message,
        });
      }

      return next(error);
    });
  };
};

export default tenantPrivateUpload;
