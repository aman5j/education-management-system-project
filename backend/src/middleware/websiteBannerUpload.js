
import multer from "multer";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WEBP banner images are allowed.")
      );
    }

    callback(null, true);
  },
});

const uploadSingleImage = upload.single("image");

const websiteBannerUpload = (req, res, next) => {
  uploadSingleImage(req, res, (error) => {
    if (error) {
      error.statusCode = 400;
      return next(error);
    }

    next();
  });
};

export default websiteBannerUpload;
