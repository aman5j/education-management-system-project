import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "categories"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    }
  );
}

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        uploadDirectory
      );
    },

    filename: (
      req,
      file,
      cb
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
          )
          .toLowerCase();

      cb(
        null,
        `${baseName}-${Date.now()}${extension}`
      );
    },
  });

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      )
    );
  }
};

const categoryUpload =
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize:
        5 * 1024 * 1024,
    },
  });

export default categoryUpload;