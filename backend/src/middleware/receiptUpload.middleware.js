import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
    return;
  }

  cb(
    new Error("Only PDF receipt files are allowed."),
    false
  );
};

const receiptUpload = multer({
  storage,

  limits: {
    // 20 MB maximum for payment receipts
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter,
});

export default receiptUpload;