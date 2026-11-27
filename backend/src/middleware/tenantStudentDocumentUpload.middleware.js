
import fs from "node:fs/promises";
import multer from "multer";

import tenantFileStorage from "../services/tenantFileStorage.js";
import {
  createTenantStudentDocumentService,
} from "../services/tenantStudentDocument.service.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MIME_EXTENSION = Object.freeze({
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ".xlsx",
});

const SIGNATURES = Object.freeze({
  "application/pdf": (buffer) =>
    buffer.subarray(0, 5).toString() === "%PDF-",

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

  "application/msword": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    ),

  "application/vnd.ms-excel": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    ),

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    (buffer) =>
      buffer.subarray(0, 2).toString() === "PK" &&
      buffer.includes(Buffer.from("word/")),

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    (buffer) =>
      buffer.subarray(0, 2).toString() === "PK" &&
      buffer.includes(Buffer.from("xl/")),
});

const createError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

const cleanupFiles = async (files = []) => {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch(() => {})
    )
  );
};

const validateFileContent = async (file) => {
  const validator = SIGNATURES[file.mimetype];

  if (!validator) {
    return false;
  }

  const buffer = await fs.readFile(file.path);

  return validator(buffer);
};

export const createTenantStudentDocumentUpload = ({
  storage = tenantFileStorage,
  documentService = createTenantStudentDocumentService({
    storage,
  }),
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES,
} = {}) => {
  if (
    !storage ||
    typeof storage.createFileName !== "function" ||
    !documentService ||
    typeof documentService.getDocumentsDirectory !== "function"
  ) {
    throw new Error("TENANT_DOCUMENT_UPLOAD_CONFIG_INVALID");
  }

  if (
    !Number.isInteger(maxFileSize) ||
    maxFileSize < 1 ||
    !Number.isInteger(maxFiles) ||
    maxFiles < 1 ||
    maxFiles > MAX_FILES
  ) {
    throw new Error("TENANT_DOCUMENT_UPLOAD_LIMIT_INVALID");
  }

  const diskStorage = multer.diskStorage({
    destination: async (req, file, callback) => {
      try {
        const directory =
          await documentService.getDocumentsDirectory(
            req.tenantContext
          );

        callback(null, directory);
      } catch (error) {
        callback(error);
      }
    },

    filename: (req, file, callback) => {
      try {
        const fileName = storage.createFileName(
          file.mimetype
        );

        callback(null, fileName);
      } catch (error) {
        callback(error);
      }
    },
  });

  const upload = multer({
    storage: diskStorage,

    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: 30,
      parts: maxFiles + 30,
    },

    fileFilter: (req, file, callback) => {
      if (!req.tenantContext) {
        return callback(
          createError("TENANT_FILE_CONTEXT_MISSING")
        );
      }

      if (
        !req.tenantUser ||
        !["admin", "staff"].includes(req.tenantUser.role)
      ) {
        return callback(
          createError("TENANT_DOCUMENT_UPLOAD_FORBIDDEN")
        );
      }

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return callback(
          createError("TENANT_FILE_TYPE_NOT_ALLOWED")
        );
      }

      callback(null, true);
    },
  });

  const uploadHandler = upload.array("documents", maxFiles);

  return (req, res, next) => {
    if (
      !req.tenantContext?.instituteId ||
      !req.tenantContext?.collectionPrefix
    ) {
      return res.status(503).json({
        success: false,
        code: "TENANT_CONTEXT_UNAVAILABLE",
        message: "Institute file storage is unavailable.",
      });
    }

    if (
      !req.tenantUser ||
      !["admin", "staff"].includes(req.tenantUser.role)
    ) {
      return res.status(403).json({
        success: false,
        code: "TENANT_DOCUMENT_UPLOAD_FORBIDDEN",
        message: "You are not authorized to upload student documents.",
      });
    }

    uploadHandler(req, res, async (error) => {
      if (error) {
        await cleanupFiles(req.files || []);

        if (error instanceof multer.MulterError) {
          const isSizeError =
            error.code === "LIMIT_FILE_SIZE";

          const isCountError =
            error.code === "LIMIT_FILE_COUNT" ||
            error.code === "LIMIT_UNEXPECTED_FILE";

          return res.status(400).json({
            success: false,
            code: isSizeError
              ? "TENANT_FILE_TOO_LARGE"
              : isCountError
                ? "TENANT_FILE_COUNT_EXCEEDED"
                : "TENANT_UPLOAD_INVALID",
            message: isSizeError
              ? "Each document must be 10 MB or smaller."
              : isCountError
                ? `You can upload a maximum of ${maxFiles} documents at once.`
                : "The document upload is invalid.",
          });
        }

        const knownErrors = {
          TENANT_FILE_CONTEXT_MISSING: 503,
          TENANT_FILE_CONTEXT_INVALID: 503,
          TENANT_FILE_PREFIX_INVALID: 503,
          TENANT_FILE_TYPE_NOT_ALLOWED: 400,
          TENANT_DOCUMENT_UPLOAD_FORBIDDEN: 403,
        };

        const status = knownErrors[error.code || error.message];

        if (status) {
          return res.status(status).json({
            success: false,
            code: error.code || error.message,
            message:
              status === 403
                ? "You are not authorized to upload student documents."
                : status === 503
                  ? "Institute file storage is unavailable."
                  : "This document type is not allowed.",
          });
        }

        return next(error);
      }

      const files = req.files || [];

      if (!files.length) {
        return res.status(400).json({
          success: false,
          code: "TENANT_DOCUMENT_REQUIRED",
          message: "Please select at least one document.",
        });
      }

      try {
        for (const file of files) {
          const valid = await validateFileContent(file);

          if (!valid) {
            await cleanupFiles(files);

            return res.status(400).json({
              success: false,
              code: "TENANT_FILE_CONTENT_INVALID",
              message:
                "The uploaded file content does not match its declared file type.",
            });
          }

          const expectedExtension = MIME_EXTENSION[file.mimetype];

          if (
            !expectedExtension ||
            !file.filename.endsWith(expectedExtension)
          ) {
            await cleanupFiles(files);

            return res.status(400).json({
              success: false,
              code: "TENANT_FILE_EXTENSION_INVALID",
              message: "The uploaded document extension is invalid.",
            });
          }
        }

        return next();
      } catch (validationError) {
        await cleanupFiles(files);
        return next(validationError);
      }
    });
  };
};

const tenantStudentDocumentUpload =
  createTenantStudentDocumentUpload();

export default tenantStudentDocumentUpload;
