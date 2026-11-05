
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

    callback(null, `${crypto.randomUUID()}${extension}`);
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

// Validate actual file bytes rather than trusting browser MIME metadata.
const hasValidSignature = async (file) => {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(
      buffer,
      0,
      buffer.length,
      0
    );

    const header = buffer.subarray(0, bytesRead);
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === ".pdf") {
      return header.subarray(0, 5).toString() === "%PDF-";
    }

    if ([".jpg", ".jpeg"].includes(extension)) {
      return (
        header.length >= 3 &&
        header[0] === 0xff &&
        header[1] === 0xd8 &&
        header[2] === 0xff
      );
    }

    if (extension === ".png") {
      return header.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a,
        ])
      );
    }

    if (extension === ".webp") {
      return (
        header.length >= 12 &&
        header.subarray(0, 4).toString() === "RIFF" &&
        header.subarray(8, 12).toString() === "WEBP"
      );
    }

    if (extension === ".doc") {
      return header.subarray(0, 8).equals(
        Buffer.from([
          0xd0, 0xcf, 0x11, 0xe0,
          0xa1, 0xb1, 0x1a, 0xe1,
        ])
      );
    }

    if ([".docx", ".zip"].includes(extension)) {
      return (
        header.length >= 4 &&
        header[0] === 0x50 &&
        header[1] === 0x4b &&
        (
          (header[2] === 0x03 && header[3] === 0x04) ||
          (header[2] === 0x05 && header[3] === 0x06) ||
          (header[2] === 0x07 && header[3] === 0x08)
        )
      );
    }

    return false;
  } finally {
    await handle.close();
  }
};

const removeUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map((file) =>
      fs.promises.unlink(file.path).catch(() => {})
    )
  );
};

const handleUpload = (fieldName) => {
  const uploadFiles = upload.array(fieldName, MAX_FILES);

  return (req, res, next) => {
    uploadFiles(req, res, async (error) => {
      const uploadedFiles = Array.isArray(req.files)
        ? req.files
        : [];

      if (error) {
        await removeUploadedFiles(uploadedFiles);

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

      try {
        for (const file of uploadedFiles) {
          const valid = await hasValidSignature(file);

          if (!valid) {
            await removeUploadedFiles(uploadedFiles);

            return res.status(415).json({
              success: false,
              message: `File content does not match its extension: ${file.originalname}`,
            });
          }
        }

        return next();
      } catch (validationError) {
        await removeUploadedFiles(uploadedFiles);
        return next(validationError);
      }
    });
  };
};

export const uploadAssignmentAttachments =
  handleUpload("attachments");

export const uploadAssignmentSubmissionFiles =
  handleUpload("files");
