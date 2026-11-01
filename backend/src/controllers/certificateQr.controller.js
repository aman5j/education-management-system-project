import mongoose from "mongoose";

import Certificate from "../models/Certificate.js";
import InstituteSettings from "../models/InstituteSettings.js";

import {
  generateCertificatePdf,
  deleteCertificatePdf,
} from "../services/certificatePdf.service.js";

import {
  buildCertificateVerificationUrl,
} from "../services/certificateVerificationUrl.service.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const refreshCertificateQr = async (
  req,
  res,
  next
) => {
  let newPdfUrl = "";

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid certificate ID.");
    }

    const certificate = await Certificate.findById(id).lean();

    if (!certificate) {
      return fail(res, 404, "Certificate not found.");
    }

    if (certificate.status === "Revoked") {
      return fail(
        res,
        409,
        "A revoked certificate cannot be refreshed."
      );
    }

    if (
      certificate.generationState !== "Generated" ||
      !certificate.certificateUrl
    ) {
      return fail(
        res,
        409,
        "Only successfully generated certificates can be refreshed."
      );
    }

    const settings = await InstituteSettings.findOne({
      key: "default",
    }).lean();

    if (!settings?.instituteName) {
      return fail(
        res,
        409,
        "Institute settings are missing."
      );
    }

    const verificationUrl =
      buildCertificateVerificationUrl(
        certificate.verificationCode
      );

    const pdf = await generateCertificatePdf({
      certificate,
      settings,
      verificationUrl,
    });

    newPdfUrl = pdf.url;

    // Update only if the original PDF and certificate status
    // have not changed while the replacement was being created.
    const updated = await Certificate.findOneAndUpdate(
      {
        _id: certificate._id,
        generationState: "Generated",
        status: { $ne: "Revoked" },
        certificateUrl: certificate.certificateUrl,
      },
      {
        $set: {
          certificateUrl: pdf.url,
        },
        $push: {
          auditHistory: {
            action: "QR_REFRESHED",
            performedBy:
              req.user?._id || req.user?.id || null,
            performedAt: new Date(),
            remarks:
              "Certificate PDF refreshed with the public verification page QR code.",
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "_id certificateNo verificationCode status certificateUrl"
    );

    if (!updated) {
      await deleteCertificatePdf(newPdfUrl);
      newPdfUrl = "";

      return fail(
        res,
        409,
        "Certificate changed during refresh. Reload and try again."
      );
    }

    // Delete the previous PDF only after the new PDF is saved.
    await deleteCertificatePdf(
      certificate.certificateUrl
    );

    return res.status(200).json({
      success: true,
      message:
        "Certificate PDF refreshed successfully. The original certificate number and verification code have been preserved.",
      data: updated,
    });
  } catch (error) {
    if (newPdfUrl) {
      await deleteCertificatePdf(newPdfUrl).catch(
        () => {}
      );
    }

    if (
      /FRONTEND_PUBLIC_URL/.test(error.message || "")
    ) {
      return fail(res, 500, error.message);
    }

    next(error);
  }
};