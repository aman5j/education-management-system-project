
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "alert-notices"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    cb(null, `alert-${randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error("Only JPG, PNG and WEBP images are allowed.")
    );
  }

  cb(null, true);
};

const alertNoticeUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

export default alertNoticeUpload;
