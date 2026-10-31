import mongoose from "mongoose";
import Certificate from "../models/Certificate.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

/*
|--------------------------------------------------------------------------
| PATCH /api/certificates/:id/share
|--------------------------------------------------------------------------
| Admin-only.
| A certificate must have a completed PDF before sharing.
|--------------------------------------------------------------------------
*/

export const shareCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return fail(res, 400, "Invalid certificate ID.");
    }

    const certificate = await Certificate.findById(id);

    if (!certificate) {
      return fail(res, 404, "Certificate not found.");
    }

    if (certificate.status === "Revoked") {
      return fail(
        res,
        409,
        "A revoked certificate cannot be shared."
      );
    }

    if (certificate.generationState !== "Generated") {
      return fail(
        res,
        409,
        "Generate the certificate PDF successfully before sharing."
      );
    }

    if (!certificate.certificateUrl) {
      return fail(
        res,
        409,
        "Certificate PDF is missing. Generate the certificate again."
      );
    }

    // Idempotent: do not create duplicate SHARED audit entries.
    if (certificate.status === "Shared") {
      return res.status(200).json({
        success: true,
        message: "This certificate has already been shared.",
        data: {
          id: String(certificate._id),
          certificateNo: certificate.certificateNo,
          status: certificate.status,
          sharedAt: certificate.sharedAt,
        },
      });
    }

    const sharedAt = new Date();
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return fail(
        res,
        401,
        "Unable to identify the administrator."
      );
    }

    // Atomic update prevents two Admin requests from sharing twice.
    const updated = await Certificate.findOneAndUpdate(
      {
        _id: certificate._id,
        status: "Generated",
        generationState: "Generated",
        certificateUrl: { $ne: "" },
      },
      {
        $set: {
          status: "Shared",
          sharedBy: adminId,
          sharedAt,
        },
        $push: {
          auditHistory: {
            action: "SHARED",
            performedBy: adminId,
            performedAt: sharedAt,
            remarks: "Certificate shared with the linked student through the Student Portal.",
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "_id certificateNo status sharedAt sharedBy"
    );

    if (!updated) {
      const latest = await Certificate.findById(id)
        .select("status generationState")
        .lean();

      if (latest?.status === "Shared") {
        return res.status(200).json({
          success: true,
          message: "This certificate has already been shared.",
          data: {
            id: String(id),
            status: "Shared",
          },
        });
      }

      return fail(
        res,
        409,
        "Certificate status changed. Refresh the page and try again."
      );
    }

    return res.status(200).json({
      success: true,
      message: "Certificate shared successfully with the student.",
      data: {
        id: String(updated._id),
        certificateNo: updated.certificateNo,
        status: updated.status,
        sharedAt: updated.sharedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/certificates
|--------------------------------------------------------------------------
| Student-only.
| Ownership comes only from req.user.studentRecord.
| Never accept a student ID from query params or request body.
|--------------------------------------------------------------------------
*/

export const getMySharedCertificates = async (
  req,
  res,
  next
) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    const studentId = req.user?.studentRecord;

    if (!studentId) {
      return fail(
        res,
        409,
        "Your login account is not linked to a student record. Please contact your institute administrator."
      );
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(
        res,
        409,
        "Your linked student record is invalid. Please contact your institute administrator."
      );
    }

    const certificates = await Certificate.find({
      student_id: studentId,
      status: "Shared",
      generationState: "Generated",
      certificateUrl: { $ne: "" },
    })
      .select(
        [
          "certificateNo",
          "certificateType",
          "studentNameSnapshot",
          "rollNoSnapshot",
          "courseNameSnapshot",
          "courseDurationSnapshot",
          "totalMarksSnapshot",
          "obtainedMarksSnapshot",
          "percentageSnapshot",
          "gradeSnapshot",
          "passStatusSnapshot",
          "issueDate",
          "certificateUrl",
          "sharedAt",
        ].join(" ")
      )
      .sort({
        sharedAt: -1,
        issueDate: -1,
      })
      .lean();

    const safeCertificates = certificates.map((item) => ({
      id: String(item._id),
      certificateNo: item.certificateNo,
      certificateType: item.certificateType,

      studentName: item.studentNameSnapshot,
      rollNo: item.rollNoSnapshot,

      courseName: item.courseNameSnapshot,
      courseDuration: item.courseDurationSnapshot,

      totalMarks: item.totalMarksSnapshot,
      obtainedMarks: item.obtainedMarksSnapshot,
      percentage: item.percentageSnapshot,
      grade: item.gradeSnapshot,
      result: item.passStatusSnapshot,

      issueDate: item.issueDate,
      sharedAt: item.sharedAt,

      status: "Shared",
      pdfUrl: item.certificateUrl,
    }));

    return res.status(200).json({
      success: true,
      data: {
        certificates: safeCertificates,
        total: safeCertificates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};