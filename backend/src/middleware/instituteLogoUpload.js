
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const uploadDir = path.resolve(
  currentDir,
  "../../uploads/institute"
);

fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },

  filename: (_req, file, callback) => {
    const extension = allowedTypes.get(file.mimetype);

    callback(
      null,
      `${crypto.randomUUID()}${extension}`
    );
  },
});

const uploadInstituteLogo = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WEBP logo files are allowed.")
      );
    }

    callback(null, true);
  },
});

export default uploadInstituteLogo;
