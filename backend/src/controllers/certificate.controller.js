
import mongoose from "mongoose";
import { randomBytes, randomUUID } from "crypto";

import Certificate from "../models/Certificate.js";
import ExamResult from "../models/ExamResult.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import InstituteSettings from "../models/InstituteSettings.js";

import {
  deleteCertificatePdf,
  generateCertificatePdf,
} from "../services/certificatePdf.service.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const actorId = (req) =>
  req.user?._id || req.user?.id || null;

const validId = (value) =>
  mongoose.isValidObjectId(value);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeCertificateNumber = () =>
  `ITTS-${new Date().getFullYear()}-${randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;

const makeVerificationCode = () =>
  randomBytes(20).toString("hex").toUpperCase();

const getStudentName = (student) =>
  [student?.firstName, student?.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

const getCourseDuration = (course) => {
  if (!course?.duration || Number(course.duration) <= 0) {
    return "";
  }

  return `${course.duration} ${
    course.durationUnit || "Months"
  }`;
};

const populateCertificate = (query) =>
  query
    .populate(
      "student_id",
      "firstName surname rollNo email"
    )
    .populate(
      "course_id",
      "courseTitle duration durationUnit"
    )
    .populate(
      "exam_id",
      "totalQuestions totalMarks"
    );

/*
|--------------------------------------------------------------------------
| Backend public URL
|--------------------------------------------------------------------------
*/

const getBackendBaseUrl = (req) => {
  const configured =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.API_BASE_URL;

  if (configured) {
    const parsed = new URL(configured);

    if (
      !["http:", "https:"].includes(parsed.protocol)
    ) {
      throw new Error(
        "BACKEND_PUBLIC_URL must use HTTP or HTTPS."
      );
    }

    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BACKEND_PUBLIC_URL must be configured in production."
    );
  }

  const host = req.get("host");

  if (
    !host ||
    !/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/i.test(host)
  ) {
    throw new Error(
      "Set BACKEND_PUBLIC_URL before generating certificates."
    );
  }

  return `${req.protocol}://${host}`;
};

/*
|--------------------------------------------------------------------------
| Search eligible results
|--------------------------------------------------------------------------
*/

const buildResultFilter = async (search) => {
  const filter = {
    resultStatus: "Published",
    attemptStatus: "Submitted",
  };

  if (!search) {
    return filter;
  }

  const regex = new RegExp(
    escapeRegex(search),
    "i"
  );

  const [students, courses] = await Promise.all([
    Student.find({
      $or: [
        { firstName: regex },
        { surname: regex },
        { rollNo: regex },
        { email: regex },
      ],
    })
      .select("_id")
      .lean(),

    Course.find({
      courseTitle: regex,
    })
      .select("_id")
      .lean(),
  ]);

  filter.$or = [
    {
      student_id: {
        $in: students.map((item) => item._id),
      },
    },
    {
      course_id: {
        $in: courses.map((item) => item._id),
      },
    },
  ];

  return filter;
};

/*
|--------------------------------------------------------------------------
| GET /api/certificates
|--------------------------------------------------------------------------
*/

export const getCertificates = async (
  req,
  res,
  next
) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 20,
        1
      ),
      100
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const status = String(
      req.query.status || "All"
    );

    const generationState = String(
      req.query.generationState || "All"
    );

    const filter = {};

    if (
      ["Generated", "Shared", "Revoked"].includes(status)
    ) {
      filter.status = status;
    }

    if (
      ["Generating", "Generated", "Failed"].includes(
        generationState
      )
    ) {
      filter.generationState = generationState;
    }

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      filter.$or = [
        { certificateNo: regex },
        { studentNameSnapshot: regex },
        { rollNoSnapshot: regex },
        { courseNameSnapshot: regex },
      ];
    }

    const [
      certificates,
      total,
      generated,
      shared,
      revoked,
      generating,
      failed,
    ] = await Promise.all([
      populateCertificate(
        Certificate.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ).lean(),

      Certificate.countDocuments(filter),

      Certificate.countDocuments({
        generationState: "Generated",
        status: { $ne: "Revoked" },
      }),

      Certificate.countDocuments({
        status: "Shared",
        generationState: "Generated",
      }),

      Certificate.countDocuments({
        status: "Revoked",
      }),

      Certificate.countDocuments({
        generationState: "Generating",
      }),

      Certificate.countDocuments({
        generationState: "Failed",
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        certificates,

        summary: {
          total: await Certificate.countDocuments(),
          generated,
          shared,
          revoked,
          generating,
          failed,
        },

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/certificates/eligible-students
|--------------------------------------------------------------------------
| Published + Submitted results.
| Pass => COURSE_COMPLETION
| Fail => EXAM_PARTICIPATION
|--------------------------------------------------------------------------
*/

export const getEligibleCertificateResults = async (
  req,
  res,
  next
) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 20,
        1
      ),
      100
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const filter = await buildResultFilter(search);

    // Include both successful and currently active reservations.
    // Failed reservations remain retryable.
    const existingIds = await Certificate.distinct(
      "exam_result_id",
      {
        generationState: {
          $in: ["Generating", "Generated"],
        },
      }
    );

    filter._id = {
      $nin: existingIds,
    };

    const [results, total] = await Promise.all([
      ExamResult.find(filter)
        .populate(
          "student_id",
          "firstName surname rollNo email profileImage signature"
        )
        .populate(
          "course_id",
          "courseTitle duration durationUnit"
        )
        .populate(
          "exam_id",
          "totalQuestions totalMarks marksPerQuestion"
        )
        .sort({
          publishedAt: -1,
          updatedAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ExamResult.countDocuments(filter),
    ]);

    const eligibleResults = results.map((result) => ({
      resultId: String(result._id),

      student: {
        id: String(result.student_id?._id || ""),
        name: getStudentName(result.student_id),
        rollNo: result.student_id?.rollNo || "",
        email: result.student_id?.email || "",
        profileImage:
          result.student_id?.profileImage || "",
      },

      course: {
        id: String(result.course_id?._id || ""),
        name: result.course_id?.courseTitle || "",
        duration: getCourseDuration(result.course_id),
      },

      exam: {
        id: String(result.exam_id?._id || ""),
        totalQuestions:
          result.exam_id?.totalQuestions || 0,

        totalMarks: Number(
          result.totalMarks ??
          result.exam_id?.totalMarks ??
          0
        ),
      },

      result: {
        obtainedMarks: Number(
          result.obtainedMarks || 0
        ),

        percentage: Number(
          result.percentage || 0
        ),

        grade: result.grade || "F",

        passStatus: result.passStatus || "Fail",

        resultStatus: result.resultStatus,

        attemptStatus: result.attemptStatus,

        publishedAt: result.publishedAt || null,
      },

      certificateType:
        result.passStatus === "Pass"
          ? "COURSE_COMPLETION"
          : "EXAM_PARTICIPATION",
    }));

    return res.status(200).json({
      success: true,

      data: {
        results: eligibleResults,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/certificates/generate/:resultId
|--------------------------------------------------------------------------
| PDF generation is completed before marking a certificate Generated.
|--------------------------------------------------------------------------
*/

export const generateCertificate = async (
  req,
  res,
  next
) => {
  let reservedId = null;
  let createdPdfUrl = "";

  // Unique owner token for this generation attempt.
  const generationToken = randomUUID();

  try {
    const { resultId } = req.params;

    if (!validId(resultId)) {
      return fail(
        res,
        400,
        "Invalid exam result ID."
      );
    }

    const result = await ExamResult.findById(resultId)
      .populate(
        "student_id",
        "firstName surname rollNo email profileImage signature"
      )
      .populate(
        "course_id",
        "courseTitle duration durationUnit"
      )
      .populate(
        "exam_id",
        "totalQuestions totalMarks"
      )
      .lean();

    if (!result) {
      return fail(
        res,
        404,
        "Exam result not found."
      );
    }

    if (result.resultStatus !== "Published") {
      return fail(
        res,
        409,
        "Only published exam results are eligible for certificates."
      );
    }

    if (result.attemptStatus !== "Submitted") {
      return fail(
        res,
        409,
        "The student must submit the exam before a certificate can be generated."
      );
    }

    if (
      !result.student_id?._id ||
      !result.course_id?._id ||
      !result.exam_id?._id
    ) {
      return fail(
        res,
        409,
        "The student, course or exam linked to this result could not be found."
      );
    }

    const studentName = getStudentName(
      result.student_id
    );

    const courseName = String(
      result.course_id.courseTitle || ""
    ).trim();

    if (!studentName) {
      return fail(
        res,
        409,
        "The student's name is missing."
      );
    }

    if (!courseName) {
      return fail(
        res,
        409,
        "The course name is missing."
      );
    }

    if (
      !Number.isFinite(Number(result.totalMarks)) ||
      Number(result.totalMarks) <= 0 ||
      !Number.isFinite(Number(result.obtainedMarks)) ||
      !Number.isFinite(Number(result.percentage))
    ) {
      return fail(
        res,
        409,
        "The published result contains invalid marks."
      );
    }

    const settings = await InstituteSettings.findOne({
      key: "default",
    }).lean();

    if (!settings?.instituteName) {
      return fail(
        res,
        409,
        "Institute name/settings are missing. Complete Institute Profile first."
      );
    }

    const baseUrl = getBackendBaseUrl(req);

    const performer = actorId(req);

    const existing = await Certificate.findOne({
      exam_result_id: result._id,
    });

    let certificate = existing;

    if (
      certificate?.generationState === "Generated" &&
      certificate.certificateUrl
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Certificate already generated for this exam result.",
        data: certificate,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Recover stale generation lock
    |--------------------------------------------------------------------------
    */

    if (
      certificate?.generationState === "Generating"
    ) {
      const lockMinutes = Math.max(
        Number(
          process.env.CERTIFICATE_GENERATION_LOCK_MINUTES ||
          15
        ),
        1
      );

      const staleBefore = new Date(
        Date.now() - lockMinutes * 60 * 1000
      );

      if (
        certificate.generationStartedAt &&
        certificate.generationStartedAt > staleBefore
      ) {
        return fail(
          res,
          409,
          "Certificate generation is already in progress."
        );
      }

      const recovered =
        await Certificate.findOneAndUpdate(
          {
            _id: certificate._id,
            generationState: "Generating",
            generationStartedAt: {
              $lte: staleBefore,
            },
          },
          {
            $set: {
              generationStartedAt: new Date(),
              generationError: "",
              generationToken,
            },

            $push: {
              auditHistory: {
                action: "GENERATING",
                performedBy: performer,
                remarks:
                  "Recovered an expired generation lock.",
              },
            },
          },
          { new: true }
        );

      if (!recovered) {
        return fail(
          res,
          409,
          "Certificate generation is already in progress."
        );
      }

      certificate = recovered;
    }

    /*
    |--------------------------------------------------------------------------
    | Retry failed generation
    |--------------------------------------------------------------------------
    */

    else if (
      certificate?.generationState === "Failed"
    ) {
      certificate =
        await Certificate.findOneAndUpdate(
          {
            _id: certificate._id,
            generationState: "Failed",
          },
          {
            $set: {
              generationState: "Generating",
              generationStartedAt: new Date(),
              generationError: "",
              certificateUrl: "",
              generationToken,
            },

            $push: {
              auditHistory: {
                action: "GENERATING",
                performedBy: performer,
                remarks:
                  "Retrying failed PDF generation.",
              },
            },
          },
          { new: true }
        );

      if (!certificate) {
        return fail(
          res,
          409,
          "Certificate retry is already in progress."
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | First generation
    |--------------------------------------------------------------------------
    */

    else if (!certificate) {
      const passStatus =
        result.passStatus === "Pass"
          ? "Pass"
          : "Fail";

      const certificateType =
        passStatus === "Pass"
          ? "COURSE_COMPLETION"
          : "EXAM_PARTICIPATION";

      try {
        certificate = await Certificate.create({
          student_id: result.student_id._id,
          course_id: result.course_id._id,
          exam_id: result.exam_id._id,
          exam_result_id: result._id,

          certificateNo: makeCertificateNumber(),
          verificationCode: makeVerificationCode(),

          certificateType,

          studentNameSnapshot: studentName,
          rollNoSnapshot:
            result.student_id.rollNo || "",
          studentEmailSnapshot:
            result.student_id.email || "",
          studentPhotoSnapshot:
            result.student_id.profileImage || "",
          studentSignatureSnapshot:
            result.student_id.signature || "",

          courseNameSnapshot: courseName,

          courseDurationSnapshot:
            getCourseDuration(result.course_id),

          totalMarksSnapshot: Number(
            result.totalMarks ??
            result.exam_id.totalMarks ??
            0
          ),

          obtainedMarksSnapshot: Number(
            result.obtainedMarks || 0
          ),

          percentageSnapshot: Number(
            result.percentage || 0
          ),

          gradeSnapshot: result.grade || "F",

          passStatusSnapshot: passStatus,

          resultPublishedAt:
            result.publishedAt || null,

          issueDate: new Date(),

          generationState: "Generating",
          generationStartedAt: new Date(),
          generationToken,

          status: "Generated",

          generatedBy: performer,

          auditHistory: [
            {
              action: "GENERATING",
              performedBy: performer,
              remarks:
                `${certificateType} PDF generation started.`,
            },
          ],
        });
      } catch (createError) {
        if (createError.code === 11000) {
          const raced = await Certificate.findOne({
            exam_result_id: result._id,
          }).lean();

          if (
            raced?.generationState === "Generated" &&
            raced.certificateUrl
          ) {
            return res.status(200).json({
              success: true,
              message:
                "Certificate already generated for this exam result.",
              data: raced,
            });
          }

          return fail(
            res,
            409,
            "Certificate generation has already been reserved by another request."
          );
        }

        throw createError;
      }
    }

    if (!certificate) {
      return fail(
        res,
        409,
        "Certificate generation reservation failed."
      );
    }

    reservedId = certificate._id;

    /*
    |--------------------------------------------------------------------------
    | Create verification QR URL
    |--------------------------------------------------------------------------
    */

    const verificationUrl =
      `${baseUrl}/api/public/certificates/verify/` +
      encodeURIComponent(certificate.verificationCode);

    /*
    |--------------------------------------------------------------------------
    | Generate PDF
    |--------------------------------------------------------------------------
    */

    const pdf = await generateCertificatePdf({
      certificate: certificate.toObject(),
      settings,
      verificationUrl,
    });

    createdPdfUrl = pdf.url;

    /*
    |--------------------------------------------------------------------------
    | Complete only if this request still owns the lock
    |--------------------------------------------------------------------------
    */

    const completed =
      await Certificate.findOneAndUpdate(
        {
          _id: certificate._id,
          generationState: "Generating",
          generationToken,
        },
        {
          $set: {
            generationState: "Generated",
            certificateUrl: pdf.url,
            generationError: "",
          },

          $unset: {
            generationToken: 1,
          },

          $push: {
            auditHistory: {
              action: "GENERATED",
              performedBy: performer,
              remarks:
                "PDF created and stored successfully.",
            },
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!completed) {
      throw new Error(
        "Generation lock was lost before completion."
      );
    }

    return res.status(201).json({
      success: true,
      message: "Certificate PDF generated successfully.",
      data: completed,
    });
  } catch (error) {
    if (createdPdfUrl) {
      await deleteCertificatePdf(
        createdPdfUrl
      ).catch(() => {});
    }

    if (reservedId) {
      await Certificate.findOneAndUpdate(
        {
          _id: reservedId,
          generationState: "Generating",
          generationToken,
        },
        {
          $set: {
            generationState: "Failed",
            certificateUrl: "",
            generationError: String(
              error.message || "PDF generation failed."
            ).slice(0, 1000),
          },

          $unset: {
            generationToken: 1,
          },

          $push: {
            auditHistory: {
              action: "GENERATION_FAILED",
              performedBy: actorId(req),
              remarks: String(
                error.message || "PDF generation failed."
              ).slice(0, 500),
            },
          },
        }
      ).catch(() => {});
    }

    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      return fail(res, 400, error.message);
    }

    if (
      /BACKEND_PUBLIC_URL/.test(error.message || "")
    ) {
      return fail(res, 500, error.message);
    }

    return fail(
      res,
      500,
      `Certificate PDF generation failed: ${
        error.message || "Unexpected error."
      }`
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/certificates/:id
|--------------------------------------------------------------------------
*/

export const getCertificateById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return fail(
        res,
        400,
        "Invalid certificate ID."
      );
    }

    const certificate = await populateCertificate(
      Certificate.findById(id)
    ).lean();

    if (!certificate) {
      return fail(
        res,
        404,
        "Certificate not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/public/certificates/verify/:verificationCode
|--------------------------------------------------------------------------
| Public endpoint.
| Never return private database fields.
|--------------------------------------------------------------------------
*/

export const verifyCertificatePublic = async (
  req,
  res,
  next
) => {
  try {
    const code = String(
      req.params.verificationCode || ""
    )
      .trim()
      .toUpperCase();

    if (!/^[A-F0-9]{40}$/.test(code)) {
      return fail(
        res,
        400,
        "Invalid verification code."
      );
    }

    const certificate = await Certificate.findOne({
      verificationCode: code,
      generationState: "Generated",
      status: {
        $ne: "Revoked",
      },
      certificateUrl: {
        $ne: "",
      },
    })
      .select(
        "certificateNo certificateType studentNameSnapshot rollNoSnapshot courseNameSnapshot courseDurationSnapshot totalMarksSnapshot obtainedMarksSnapshot percentageSnapshot gradeSnapshot passStatusSnapshot issueDate status certificateUrl"
      )
      .lean();

    if (!certificate) {
      return res.status(404).json({
        success: true,

        data: {
          valid: false,
          message:
            "Certificate not found, not yet generated, or revoked.",
        },
      });
    }

    const settings = await InstituteSettings.findOne({
      key: "default",
    })
      .select("instituteName")
      .lean();

    return res.status(200).json({
      success: true,

      data: {
        valid: true,

        certificateNo:
          certificate.certificateNo,

        certificateType:
          certificate.certificateType,

        studentName:
          certificate.studentNameSnapshot,

        rollNo:
          certificate.rollNoSnapshot,

        courseName:
          certificate.courseNameSnapshot,

        courseDuration:
          certificate.courseDurationSnapshot,

        totalMarks:
          certificate.totalMarksSnapshot,

        obtainedMarks:
          certificate.obtainedMarksSnapshot,

        percentage:
          certificate.percentageSnapshot,

        grade:
          certificate.gradeSnapshot,

        result:
          certificate.passStatusSnapshot,

        issueDate:
          certificate.issueDate,

        instituteName:
          settings?.instituteName || "",

        pdfUrl:
          certificate.certificateUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
