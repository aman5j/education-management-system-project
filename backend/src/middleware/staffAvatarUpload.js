
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "staff"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = allowedTypes.get(file.mimetype);
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const staffAvatarUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WEBP images are allowed.")
      );
    }

    callback(null, true);
  },
});

export default staffAvatarUpload;
