
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const ASSIGNMENT_UPLOAD_DIRECTORY = path.resolve(
  process.cwd(),
  "private_uploads",
  "assignments"
);

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

fs.mkdirSync(ASSIGNMENT_UPLOAD_DIRECTORY, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, ASSIGNMENT_UPLOAD_DIRECTORY);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    callback(
      null,
      `${crypto.randomUUID()}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedExtensions.has(extension) ||
      !allowedMimeTypes.has(file.mimetype)
    ) {
      const error = new Error(
        "Unsupported file. Allowed formats: PDF, DOC, DOCX, JPG, PNG, WEBP and ZIP."
      );

      error.statusCode = 415;
      return callback(error);
    }

    callback(null, true);
  },
});

const handleUpload = (fieldName) => {
  const uploadFiles = upload.array(fieldName, MAX_FILES);

  return (req, res, next) => {
    uploadFiles(req, res, async (error) => {
      if (error) {
        const uploadedFiles = Array.isArray(req.files)
          ? req.files
          : [];

        await Promise.all(
          uploadedFiles.map((file) =>
            fs.promises.unlink(file.path).catch(() => {})
          )
        );

        if (error instanceof multer.MulterError) {
          const message =
            error.code === "LIMIT_FILE_SIZE"
              ? "Each file must be 20 MB or smaller."
              : error.code === "LIMIT_FILE_COUNT"
                ? "You can upload a maximum of 10 files at a time."
                : error.message;

          return res.status(400).json({
            success: false,
            message,
          });
        }

        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message || "File upload failed.",
        });
      }

      return next();
    });
  };
};

export const uploadAssignmentAttachments =
  handleUpload("attachments");

export const uploadAssignmentSubmissionFiles =
  handleUpload("files");
