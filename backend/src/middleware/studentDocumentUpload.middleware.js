import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.resolve(
  process.cwd(),
  "private_uploads",
  "students",
  "documents"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension =
      path.extname(
        file.originalname
      ).toLowerCase();

    const baseName = path
      .basename(
        file.originalname,
        extension
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .slice(0, 80);

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${baseName || "document"}${extension}`;

    callback(
      null,
      uniqueName
    );
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const fileFilter = (
  req,
  file,
  callback
) => {
  if (
    allowedMimeTypes.has(
      file.mimetype
    )
  ) {
    callback(null, true);
    return;
  }

  callback(
    new Error(
      "Only PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS and XLSX documents are allowed."
    )
  );
};

const studentDocumentUpload =
  multer({
    storage,
    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,

      files: 10,
    },
  });

export default studentDocumentUpload;