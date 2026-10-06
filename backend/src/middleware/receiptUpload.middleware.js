import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (
  req,
  file,
  callback
) => {
  if (
    file.mimetype !==
    "application/pdf"
  ) {
    return callback(
      new Error(
        "Only PDF files are allowed."
      ),
      false
    );
  }

  callback(null, true);
};

const receiptUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export default receiptUpload;