import fs from "fs";
import path from "path";
import crypto from "crypto";

const uploadReceiptPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt PDF is required.",
      });
    }

    // Support both names
    const receiptNo = String(
      req.body.receiptNo ||
        req.body.receipt_no ||
        "payment-receipt"
    )
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, "-");

    const uploadDirectory = path.join(
      process.cwd(),
      "uploads",
      "receipts"
    );

    await fs.promises.mkdir(
      uploadDirectory,
      {
        recursive: true,
      }
    );

    const uniqueName =
      `payment-receipt-${receiptNo}-${crypto
        .randomBytes(8)
        .toString("hex")}.pdf`;

    const filePath = path.join(
      uploadDirectory,
      uniqueName
    );

    await fs.promises.writeFile(
      filePath,
      req.file.buffer
    );

    /*
     * Public backend URL
     *
     * Example:
     * https://education-management-backend-79g1.onrender.com
     */
    const baseUrl =
      `${req.protocol}://${req.get("host")}`;

    const receiptUrl =
      `${baseUrl}/uploads/receipts/${encodeURIComponent(
        uniqueName
      )}`;

    console.log(
      "Payment receipt uploaded successfully."
    );

    console.log(
      "Receipt No:",
      receiptNo
    );

    console.log(
      "Receipt URL:",
      receiptUrl
    );

    return res.status(201).json({
      success: true,
      message:
        "Receipt uploaded successfully.",
      data: {
        receiptUrl,
        fileName: uniqueName,
        receiptNo,
      },
    });
  } catch (error) {
    console.error(
      "Upload receipt PDF error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload receipt PDF.",
    });
  }
};

export default uploadReceiptPdf;