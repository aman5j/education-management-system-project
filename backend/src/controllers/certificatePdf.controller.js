
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import Certificate from "../models/Certificate.js";
import {
  getCertificateOutputDirectory,
} from "../services/certificatePdf.service.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const sendCertificatePdf = (res, certificate, next) => {
  const storedUrl = String(certificate.certificateUrl || "");
  const fileName = path.basename(storedUrl);

  if (
    !fileName ||
    fileName !== storedUrl.split("/").pop() ||
    !fileName.toLowerCase().endsWith(".pdf")
  ) {
    return fail(res, 404, "Certificate PDF is unavailable.");
  }

  const outputDirectory = path.resolve(
    getCertificateOutputDirectory()
  );

  const filePath = path.resolve(outputDirectory, fileName);

  if (!filePath.startsWith(outputDirectory + path.sep)) {
    return fail(res, 400, "Invalid certificate file path.");
  }

  const stream = fs.createReadStream(filePath);

  stream.on("error", (error) => {
    if (error.code === "ENOENT") {
      if (!res.headersSent) {
        return fail(
          res,
          404,
          "Certificate PDF file was not found. Check backend persistent storage."
        );
      }

      return res.destroy(error);
    }

    if (!res.headersSent) {
      next(error);
    } else {
      res.destroy(error);
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${fileName}"`
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");

  stream.pipe(res);
};

/**
 * GET /api/certificates/:id/pdf
 * Admin-only. Authentication is enforced by certificate.routes.js.
 */
export const getAdminCertificatePdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid certificate ID.");
    }

    const certificate = await Certificate.findById(id)
      .select("_id generationState status certificateUrl")
      .lean();

    if (!certificate) {
      return fail(res, 404, "Certificate not found.");
    }

    if (
      certificate.generationState !== "Generated" ||
      !certificate.certificateUrl
    ) {
      return fail(res, 409, "Certificate PDF is not generated.");
    }

    return sendCertificatePdf(res, certificate, next);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student-portal/certificates/:id/pdf
 * Student-only. Only the linked student can download a shared certificate.
 */
export const getStudentCertificatePdf = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.studentRecord;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid certificate ID.");
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(
        res,
        403,
        "Your login is not linked to a valid student record."
      );
    }

    const certificate = await Certificate.findOne({
      _id: id,
      student_id: studentId,
      status: "Shared",
      generationState: "Generated",
      certificateUrl: { $ne: "" },
    })
      .select("_id generationState status certificateUrl")
      .lean();

    if (!certificate) {
      return fail(
        res,
        404,
        "Shared certificate not found or access denied."
      );
    }

    return sendCertificatePdf(res, certificate, next);
  } catch (error) {
    next(error);
  }
};
