import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory =
  path.resolve(
    process.cwd(),
    "uploads",
    "students"
  );

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        uploadDirectory
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path.extname(
          file.originalname
        );

      const baseName =
        path
          .basename(
            file.originalname,
            extension
          )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          );

      const uniqueName =
        `${Date.now()}-${baseName}${extension}`;

      callback(
        null,
        uniqueName
      );
    },
  });

const fileFilter = (
  req,
  file,
  callback
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];

  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {
    callback(null, true);
  } else {
    callback(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      )
    );
  }
};

const studentUpload =
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize:
        5 * 1024 * 1024,
      files: 2,
    },
  });

export default studentUpload;