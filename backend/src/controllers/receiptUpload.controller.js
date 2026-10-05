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

    const receiptNo =
      String(
        req.body.receipt_no || "payment-receipt"
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
      `${receiptNo}-${crypto
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

    const baseUrl =
      `${req.protocol}://${req.get("host")}`;

    const receiptUrl =
      `${baseUrl}/uploads/receipts/${encodeURIComponent(
        uniqueName
      )}`;

    return res.status(201).json({
      success: true,
      message:
        "Receipt uploaded successfully.",
      data: {
        receiptUrl,
        fileName: uniqueName,
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