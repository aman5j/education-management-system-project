import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const NOTES_UPLOAD_DIRECTORY = path.resolve(
  process.cwd(),
  "private_uploads",
  "notes"
);

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

fs.mkdirSync(NOTES_UPLOAD_DIRECTORY, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, NOTES_UPLOAD_DIRECTORY);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedExtensions.has(extension) ||
      !allowedMimeTypes.has(file.mimetype)
    ) {
      const error = new Error(
        "Unsupported attachment. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG and WEBP."
      );

      error.statusCode = 415;
      return callback(error);
    }

    callback(null, true);
  },
}).array("attachments", 10);

export const uploadNotesAttachments = (req, res, next) => {
  upload(req, res, async (error) => {
    if (error) {
      // Remove files already written if a later file fails.
      const uploadedFiles = Array.isArray(req.files) ? req.files : [];

      await Promise.all(
        uploadedFiles.map((file) =>
          fs.promises.unlink(file.path).catch(() => {})
        )
      );

      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Each attachment must be 20 MB or smaller."
            : error.code === "LIMIT_FILE_COUNT"
              ? "You can upload a maximum of 10 attachments at a time."
              : error.message;

        return res.status(400).json({
          success: false,
          message,
        });
      }

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Attachment upload failed.",
      });
    }

    next();
  });
};