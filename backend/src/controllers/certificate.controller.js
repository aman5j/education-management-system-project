
import mongoose from "mongoose";
import { randomBytes } from "crypto";

import Certificate from "../models/Certificate.js";
import ExamResult from "../models/ExamResult.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";

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

const makeCertificateNumber = () => {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `ITTS-${year}-${suffix}`;
};

const makeVerificationCode = () =>
  randomBytes(16).toString("hex").toUpperCase();

const getStudentName = (student) =>
  [student?.firstName, student?.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

const getCourseDuration = (course) => {
  if (!course?.duration || Number(course.duration) <= 0) {
    return "";
  }

  return `${course.duration} ${course.durationUnit || "Months"}`;
};

const populateCertificate = (query) =>
  query
    .populate("student_id", "firstName surname rollNo email")
    .populate("course_id", "courseTitle")
    .populate("exam_id", "totalQuestions totalMarks");

const buildResultFilter = async (search) => {
  const filter = {
    resultStatus: "Published",
    attemptStatus: "Submitted",
  };

  if (!search) return filter;

  const regex = new RegExp(escapeRegex(search), "i");

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
        $in: students.map((student) => student._id),
      },
    },
    {
      course_id: {
        $in: courses.map((course) => course._id),
      },
    },
  ];

  return filter;
};

/*
|--------------------------------------------------------------------------
| GET /api/certificates
|--------------------------------------------------------------------------
| Admin certificate list.
|--------------------------------------------------------------------------
*/

export const getCertificates = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "All");

    const filter = {};

    if (["Generated", "Shared", "Revoked"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { certificateNo: regex },
        { studentNameSnapshot: regex },
        { rollNoSnapshot: regex },
        { courseNameSnapshot: regex },
      ];
    }

    const [certificates, total, generated, shared, revoked] =
      await Promise.all([
        populateCertificate(
          Certificate.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
        ).lean(),

        Certificate.countDocuments(filter),

        Certificate.countDocuments({ status: "Generated" }),

        Certificate.countDocuments({ status: "Shared" }),

        Certificate.countDocuments({ status: "Revoked" }),
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
| All submitted and published results are eligible.
| Pass => Course Completion Certificate.
| Fail => Exam Participation Certificate.
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
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const search = String(req.query.search || "").trim();

    const filter = await buildResultFilter(search);

    const existingCertificateResultIds =
      await Certificate.distinct("exam_result_id");

    filter._id = {
      $nin: existingCertificateResultIds,
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
        .sort({ publishedAt: -1, updatedAt: -1 })
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
        profileImage: result.student_id?.profileImage || "",
      },

      course: {
        id: String(result.course_id?._id || ""),
        name: result.course_id?.courseTitle || "",
        duration: getCourseDuration(result.course_id),
      },

      exam: {
        id: String(result.exam_id?._id || ""),
        totalQuestions: result.exam_id?.totalQuestions || 0,
        totalMarks: Number(
          result.totalMarks ?? result.exam_id?.totalMarks ?? 0
        ),
      },

      result: {
        obtainedMarks: Number(result.obtainedMarks || 0),
        percentage: Number(result.percentage || 0),
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
| Generate a certificate record from a published result.
| PDF generation is implemented in the next phase.
|--------------------------------------------------------------------------
*/

export const generateCertificate = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    if (!validId(resultId)) {
      return fail(res, 400, "Invalid exam result ID.");
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
      .populate("exam_id", "totalQuestions totalMarks")
      .lean();

    if (!result) {
      return fail(res, 404, "Exam result not found.");
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

    if (!result.student_id?._id) {
      return fail(
        res,
        409,
        "The student linked to this result could not be found."
      );
    }

    if (!result.course_id?._id) {
      return fail(
        res,
        409,
        "The course linked to this result could not be found."
      );
    }

    if (!result.exam_id?._id) {
      return fail(
        res,
        409,
        "The exam linked to this result could not be found."
      );
    }

    const studentName = getStudentName(result.student_id);

    if (!studentName) {
      return fail(
        res,
        409,
        "The student's name is missing. Update the student record first."
      );
    }

    const courseName = result.course_id.courseTitle;

    if (!courseName) {
      return fail(
        res,
        409,
        "The course name is missing."
      );
    }

    const passStatus =
      result.passStatus === "Pass" ? "Pass" : "Fail";

    const certificateType =
      passStatus === "Pass"
        ? "COURSE_COMPLETION"
        : "EXAM_PARTICIPATION";

    const existing = await Certificate.findOne({
      exam_result_id: result._id,
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A certificate has already been generated for this exam result.",
        data: {
          certificateId: String(existing._id),
          certificateNo: existing.certificateNo,
          status: existing.status,
        },
      });
    }

    const certificate = await Certificate.create({
      student_id: result.student_id._id,
      course_id: result.course_id._id,
      exam_id: result.exam_id._id,
      exam_result_id: result._id,

      certificateNo: makeCertificateNumber(),
      verificationCode: makeVerificationCode(),

      certificateType,

      studentNameSnapshot: studentName,
      rollNoSnapshot: result.student_id.rollNo || "",
      studentEmailSnapshot: result.student_id.email || "",
      studentPhotoSnapshot: result.student_id.profileImage || "",
      studentSignatureSnapshot: result.student_id.signature || "",

      courseNameSnapshot: courseName,
      courseDurationSnapshot: getCourseDuration(result.course_id),

      totalMarksSnapshot: Number(
        result.totalMarks ?? result.exam_id.totalMarks ?? 0
      ),
      obtainedMarksSnapshot: Number(result.obtainedMarks || 0),
      percentageSnapshot: Number(result.percentage || 0),
      gradeSnapshot: result.grade || "F",
      passStatusSnapshot: passStatus,

      resultPublishedAt: result.publishedAt || null,

      issueDate: new Date(),
      status: "Generated",

      generatedBy: actorId(req),

      auditHistory: [
        {
          action: "GENERATED",
          performedBy: actorId(req),
          remarks: `${certificateType} generated from published exam result.`,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Certificate record generated successfully. PDF generation will be added in the next phase.",
      data: certificate,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Certificate.findOne({
        exam_result_id: req.params.resultId,
      }).lean();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "A certificate has already been generated for this exam result.",
          data: {
            certificateId: String(existing._id),
            certificateNo: existing.certificateNo,
            status: existing.status,
          },
        });
      }

      return fail(
        res,
        409,
        "A duplicate certificate number was generated. Please retry."
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return fail(res, 400, error.message);
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/certificates/:id
|--------------------------------------------------------------------------
| Admin certificate detail.
|--------------------------------------------------------------------------
*/

export const getCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return fail(res, 400, "Invalid certificate ID.");
    }

    const certificate = await populateCertificate(
      Certificate.findById(id)
    ).lean();

    if (!certificate) {
      return fail(res, 404, "Certificate not found.");
    }

    return res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};
