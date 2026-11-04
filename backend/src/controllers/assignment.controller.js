import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import AssignmentSubmissionVersion from "../models/AssignmentSubmissionVersion.js";
import AssignmentEvaluation from "../models/AssignmentEvaluation.js";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";

import {
  ASSIGNMENT_UPLOAD_DIRECTORY,
} from "../middleware/assignmentUpload.middleware.js";

// =====================================================
// COMMON HELPERS
// =====================================================

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (id) => mongoose.isValidObjectId(id);

const removeFiles = async (files = []) => {
  await Promise.all(
    files.map((file) => {
      const name = path.basename(file.storedName || "");

      if (!name) return Promise.resolve();

      return fs
        .unlink(path.join(ASSIGNMENT_UPLOAD_DIRECTORY, name))
        .catch(() => {});
    })
  );
};

const uploadedMetadata = (files = []) =>
  files.map((file) => ({
    originalName: path.basename(file.originalname || "file"),
    storedName: file.filename,
    mimeType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  }));

const populateAssignment = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate("subject_id", "subjectName subjectCode")
    .populate("batch_ids", "batch_name status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

const serializeAssignment = (item) => ({
  id: String(item._id),
  title: item.title,
  description: item.description || "",
  instructions: item.instructions || "",

  course: item.course_id
    ? {
        id: String(item.course_id._id || item.course_id),
        title: item.course_id.courseTitle || "",
      }
    : null,

  subject: item.subject_id
    ? {
        id: String(item.subject_id._id || item.subject_id),
        name: item.subject_id.subjectName || "",
        code: item.subject_id.subjectCode || "",
      }
    : null,

  batches: (item.batch_ids || []).map((batch) => ({
    id: String(batch._id || batch),
    name: batch.batch_name || "",
    status: batch.status || "",
  })),

  total_marks: item.total_marks,
  assignedAt: item.assignedAt,
  dueAt: item.dueAt,
  allowLateSubmission: item.allowLateSubmission,
  allowResubmission: item.allowResubmission,
  status: item.status,

  attachments: (item.attachments || []).map((file) => ({
    id: String(file._id),
    originalName: file.originalName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    uploadedAt: file.uploadedAt,
  })),

  publishedAt: item.publishedAt,
  archivedAt: item.archivedAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

// =====================================================
// BOOLEAN AND REQUEST-BODY NORMALIZATION
// =====================================================

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return null;
};

const normalizeAssignmentInput = (body = {}) => {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const instructions = String(body.instructions || "").trim();
  const course_id = String(body.course_id || "").trim();

  const subject_id = body.subject_id
    ? String(body.subject_id).trim()
    : null;

  let batch_ids = body.batch_ids;

  if (typeof batch_ids === "string") {
    try {
      batch_ids = JSON.parse(batch_ids);
    } catch {
      return {
        error: "batch_ids must be a JSON array of batch IDs.",
      };
    }
  }

  if (
    batch_ids === undefined ||
    batch_ids === null ||
    batch_ids === ""
  ) {
    batch_ids = [];
  }

  const total_marks = Number(body.total_marks);

  const assignedAt = body.assignedAt
    ? new Date(body.assignedAt)
    : new Date();

  const dueAt = new Date(body.dueAt);

  const allowLateSubmission = parseBoolean(
    body.allowLateSubmission
  );

  const allowResubmission = parseBoolean(
    body.allowResubmission
  );

  // Title validation
  if (title.length < 2 || title.length > 200) {
    return {
      error: "Title must contain 2 to 200 characters.",
    };
  }

  // Description validation
  if (description.length > 10000) {
    return {
      error: "Description cannot exceed 10,000 characters.",
    };
  }

  // Instructions validation
  if (instructions.length > 15000) {
    return {
      error: "Instructions cannot exceed 15,000 characters.",
    };
  }

  // Marks validation
  if (
    !Number.isFinite(total_marks) ||
    total_marks <= 0 ||
    total_marks > 100000
  ) {
    return {
      error:
        "Total marks must be greater than 0 and at most 100,000.",
    };
  }

  // Date validation
  if (
    Number.isNaN(assignedAt.getTime()) ||
    Number.isNaN(dueAt.getTime())
  ) {
    return {
      error: "Valid assignedAt and dueAt dates are required.",
    };
  }

  if (dueAt <= assignedAt) {
    return {
      error: "Due date must be later than the assigned date.",
    };
  }

  // Batch validation
  if (!Array.isArray(batch_ids)) {
    return {
      error: "batch_ids must be an array.",
    };
  }

  // Boolean validation
  if (
    allowLateSubmission === null ||
    allowResubmission === null
  ) {
    return {
      error:
        "Late submission and resubmission settings must be true or false.",
    };
  }

  return {
    data: {
      title,
      description,
      instructions,
      course_id,
      subject_id,
      batch_ids,
      total_marks,
      assignedAt,
      dueAt,
      allowLateSubmission,
      allowResubmission,
    },
  };
};

// =====================================================
// COURSE / SUBJECT / BATCH VALIDATION
// =====================================================

const validateCourseSubjectBatches = async ({
  courseId,
  subjectId,
  batchIds,
}) => {
  if (!validId(courseId)) {
    return {
      error: "A valid course_id is required.",
    };
  }

  const course = await Course.findById(courseId)
    .select("_id courseTitle subjects")
    .lean();

  if (!course) {
    return {
      error: "Course not found.",
      status: 404,
    };
  }

  let subject = null;

  // Subject is optional.
  if (subjectId) {
    if (!validId(subjectId)) {
      return {
        error: "Invalid subject_id.",
      };
    }

    subject = await Subject.findById(subjectId)
      .select("_id subjectName subjectCode status")
      .lean();

    if (!subject) {
      return {
        error: "Subject not found.",
        status: 404,
      };
    }

    if (subject.status !== "Active") {
      return {
        error: "Selected subject is inactive.",
      };
    }

    const belongsToCourse = (course.subjects || []).some(
      (id) => String(id) === String(subject._id)
    );

    if (!belongsToCourse) {
      return {
        error: "Selected subject does not belong to this course.",
      };
    }
  }

  // Batches are optional and can contain multiple IDs.
  const normalizedBatchIds = [
    ...new Set((batchIds || []).map((id) => String(id).trim())),
  ];

  if (normalizedBatchIds.some((id) => !validId(id))) {
    return {
      error: "One or more batch IDs are invalid.",
    };
  }

  if (normalizedBatchIds.length) {
    const batches = await Batch.find({
      _id: {
        $in: normalizedBatchIds,
      },
      course_id: course._id,
    })
      .select("_id")
      .lean();

    if (batches.length !== normalizedBatchIds.length) {
      return {
        error:
          "Every selected batch must belong to the selected course.",
      };
    }
  }

  return {
    course,
    subject,
    batchIds: normalizedBatchIds,
  };
};

// =====================================================
// STUDENT ACCESS HELPERS
// =====================================================

const getStudent = async (req) => {
  const studentId = req.user?.studentRecord;

  if (!studentId || !validId(String(studentId))) {
    return {
      error: {
        status: 409,
        message:
          "Your login is not linked to a valid student record.",
      },
    };
  }

  const student = await Student.findOne({
    _id: studentId,
    status: "active",
  }).select("_id status");

  if (!student) {
    return {
      error: {
        status: 403,
        message:
          "Your student record is inactive or unavailable.",
      },
    };
  }

  return {
    student,
  };
};

const getEligibleAdmission = async (assignment, studentId) => {
  const filter = {
    student_id: studentId,
    course_id: assignment.course_id,
    status: "Active",
  };

  if (assignment.batch_ids?.length) {
    filter.batch_id = {
      $in: assignment.batch_ids,
    };
  }

  return StudentAdmission.findOne(filter)
    .sort({ createdAt: -1 })
    .select("_id student_id course_id batch_id status")
    .lean();
};

// =====================================================
// INITIALIZE ELIGIBLE STUDENT TRACKERS
// =====================================================

const initializeEligibleTrackers = async (assignment) => {
  const admissionFilter = {
    course_id: assignment.course_id,
    status: "Active",
  };

  if (assignment.batch_ids?.length) {
    admissionFilter.batch_id = {
      $in: assignment.batch_ids,
    };
  }

  const admissions = await StudentAdmission.find(admissionFilter)
    .sort({ createdAt: -1 })
    .select("_id student_id")
    .lean();

  if (!admissions.length) {
    return 0;
  }

  const studentIds = [
    ...new Set(
      admissions.map((item) => String(item.student_id))
    ),
  ];

  const activeStudents = await Student.find({
    _id: {
      $in: studentIds,
    },
    status: "active",
  })
    .select("_id")
    .lean();

  const activeIds = new Set(
    activeStudents.map((item) => String(item._id))
  );

  /*
   * One tracker is allowed per assignment/student.
   *
   * A student may have more than one matching Active admission.
   * Because admissions are sorted newest first, the first matching
   * admission is retained for the tracker.
   */
  const admissionByStudent = new Map();

  for (const admission of admissions) {
    const studentId = String(admission.student_id);

    if (
      activeIds.has(studentId) &&
      !admissionByStudent.has(studentId)
    ) {
      admissionByStudent.set(studentId, admission);
    }
  }

  const operations = Array.from(
    admissionByStudent.values()
  ).map((admission) => ({
    updateOne: {
      filter: {
        assignment_id: assignment._id,
        student_id: admission.student_id,
      },
      update: {
        $setOnInsert: {
          assignment_id: assignment._id,
          student_id: admission.student_id,
          admission_id: admission._id,
          status: "Pending",
        },
      },
      upsert: true,
    },
  }));

  if (operations.length) {
    await AssignmentSubmission.bulkWrite(operations, {
      ordered: false,
    });
  }

  return operations.length;
};

const getAssignmentForStudent = async (
  assignmentId,
  studentId
) => {
  const assignment = await Assignment.findOne({
    _id: assignmentId,
    status: "Published",
  });

  if (!assignment) {
    return {
      error: "Published assignment not found.",
      status: 404,
    };
  }

  const admission = await getEligibleAdmission(
    assignment,
    studentId
  );

  if (!admission) {
    return {
      error:
        "You do not have an Active admission eligible for this assignment.",
      status: 403,
    };
  }

  return {
    assignment,
    admission,
  };
};

// =====================================================
// PRIVATE FILE HELPERS
// =====================================================

const findAttachment = (assignment, fileId) => {
  if (!validId(fileId)) return null;

  return assignment.attachments.id(fileId) || null;
};

const sendPrivateFile = async (res, file, download = true) => {
  const storedName = path.basename(file?.storedName || "");

  if (!storedName) {
    return fail(res, 404, "File not found.");
  }

  const filePath = path.resolve(
    ASSIGNMENT_UPLOAD_DIRECTORY,
    storedName
  );

  if (path.dirname(filePath) !== ASSIGNMENT_UPLOAD_DIRECTORY) {
    return fail(res, 404, "File not found.");
  }

  try {
    await fs.access(filePath);
  } catch {
    return fail(res, 404, "File is missing from storage.");
  }

  res.setHeader(
    "Content-Type",
    file.mimeType || "application/octet-stream"
  );

  res.setHeader("X-Content-Type-Options", "nosniff");

  const safeName = String(
    file.originalName || "assignment-file"
  ).replace(/[\r\n"]/g, "_");

  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${safeName}"`
  );

  return res.sendFile(filePath);
};

// =====================================================
// ADMIN: LIST ASSIGNMENTS
// GET /api/assignments/admin
// =====================================================

export const adminGetAssignments = async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const filter = {};

    if (req.query.status) {
      if (
        !["Draft", "Published", "Archived"].includes(
          req.query.status
        )
      ) {
        return fail(res, 400, "Invalid assignment status.");
      }

      filter.status = req.query.status;
    }

    if (req.query.course_id) {
      if (!validId(req.query.course_id)) {
        return fail(res, 400, "Invalid course_id.");
      }

      filter.course_id = req.query.course_id;
    }

    if (req.query.search) {
      filter.title = {
        $regex: String(req.query.search).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        $options: "i",
      };
    }

    const [items, total] = await Promise.all([
      populateAssignment(
        Assignment.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ).lean(),

      Assignment.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        assignments: items.map(serializeAssignment),
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

// =====================================================
// ADMIN: CREATE ASSIGNMENT
// POST /api/assignments/admin
// multipart/form-data: attachments[]
// =====================================================

export const adminCreateAssignment = async (
  req,
  res,
  next
) => {
  const files = req.files || [];

  try {
    const normalized = normalizeAssignmentInput(req.body);

    if (normalized.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 400, normalized.error);
    }

    const data = normalized.data;

    const relation = await validateCourseSubjectBatches({
      courseId: data.course_id,
      subjectId: data.subject_id,
      batchIds: data.batch_ids,
    });

    if (relation.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        relation.status || 400,
        relation.error
      );
    }

    const assignment = await Assignment.create({
      ...data,

      course_id: relation.course._id,
      subject_id: relation.subject?._id || null,
      batch_ids: relation.batchIds,

      attachments: uploadedMetadata(files),

      status: "Draft",
      createdBy: req.user._id,
    });

    const result = await populateAssignment(
      Assignment.findById(assignment._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Assignment created as Draft.",
      data: serializeAssignment(result),
    });
  } catch (error) {
    await removeFiles(uploadedMetadata(files));
    next(error);
  }
};

// =====================================================
// ADMIN: GET ONE ASSIGNMENT
// GET /api/assignments/admin/:id
// =====================================================

export const adminGetAssignment = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const item = await populateAssignment(
      Assignment.findById(req.params.id)
    ).lean();

    if (!item) {
      return fail(res, 404, "Assignment not found.");
    }

    return res.json({
      success: true,
      data: serializeAssignment(item),
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: UPDATE ASSIGNMENT
// PUT /api/assignments/admin/:id
// =====================================================

export const adminUpdateAssignment = async (
  req,
  res,
  next
) => {
  const files = req.files || [];

  try {
    if (!validId(req.params.id)) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 400, "Invalid assignment ID.");
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 404, "Assignment not found.");
    }

    if (assignment.status !== "Draft") {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        409,
        "Only Draft assignments can be edited. Archive and create a new assignment after publishing."
      );
    }

    /*
     * For partial FormData updates, retain existing values when
     * a field is not supplied.
     *
     * Boolean strings are passed through normalizeAssignmentInput
     * so "true" and "false" are handled correctly.
     */
    const normalized = normalizeAssignmentInput({
      ...assignment.toObject(),
      ...req.body,

      course_id:
        req.body.course_id ?? assignment.course_id,

      subject_id:
        req.body.subject_id !== undefined
          ? req.body.subject_id
          : assignment.subject_id,

      batch_ids:
        req.body.batch_ids !== undefined
          ? req.body.batch_ids
          : assignment.batch_ids.map(String),

      assignedAt:
        req.body.assignedAt ?? assignment.assignedAt,

      dueAt:
        req.body.dueAt ?? assignment.dueAt,

      total_marks:
        req.body.total_marks ?? assignment.total_marks,

      allowLateSubmission:
        req.body.allowLateSubmission !== undefined
          ? req.body.allowLateSubmission
          : assignment.allowLateSubmission,

      allowResubmission:
        req.body.allowResubmission !== undefined
          ? req.body.allowResubmission
          : assignment.allowResubmission,
    });

    if (normalized.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 400, normalized.error);
    }

    const data = normalized.data;

    const relation = await validateCourseSubjectBatches({
      courseId: data.course_id,
      subjectId: data.subject_id,
      batchIds: data.batch_ids,
    });

    if (relation.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        relation.status || 400,
        relation.error
      );
    }

    assignment.title = data.title;
    assignment.description = data.description;
    assignment.instructions = data.instructions;

    assignment.course_id = relation.course._id;
    assignment.subject_id = relation.subject?._id || null;
    assignment.batch_ids = relation.batchIds;

    assignment.total_marks = data.total_marks;
    assignment.assignedAt = data.assignedAt;
    assignment.dueAt = data.dueAt;

    assignment.allowLateSubmission =
      data.allowLateSubmission;

    assignment.allowResubmission =
      data.allowResubmission;

    assignment.updatedBy = req.user._id;

    if (files.length) {
      assignment.attachments.push(
        ...uploadedMetadata(files)
      );
    }

    await assignment.save();

    const result = await populateAssignment(
      Assignment.findById(assignment._id)
    ).lean();

    return res.json({
      success: true,
      message: "Draft assignment updated.",
      data: serializeAssignment(result),
    });
  } catch (error) {
    await removeFiles(uploadedMetadata(files));
    next(error);
  }
};

// =====================================================
// ADMIN: PUBLISH / ARCHIVE ASSIGNMENT
// PATCH /api/assignments/admin/:id/status
// =====================================================

export const adminUpdateAssignmentStatus = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const { status } = req.body;

    if (!["Published", "Archived"].includes(status)) {
      return fail(
        res,
        400,
        "Status must be Published or Archived."
      );
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    if (assignment.status === "Archived") {
      return fail(
        res,
        409,
        "Archived assignments cannot be republished."
      );
    }

    if (status === "Published") {
      if (
        !assignment.title ||
        !assignment.course_id ||
        !assignment.dueAt
      ) {
        return fail(
          res,
          400,
          "Assignment details are incomplete."
        );
      }

      assignment.status = "Published";
      assignment.publishedAt = new Date();
      assignment.updatedBy = req.user._id;

      await assignment.save();

      await initializeEligibleTrackers(assignment);

      return res.json({
        success: true,
        message:
          "Assignment published and eligible students initialized.",
        data: {
          id: assignment._id,
          status: assignment.status,
          publishedAt: assignment.publishedAt,
        },
      });
    }

    assignment.status = "Archived";
    assignment.archivedAt = new Date();
    assignment.updatedBy = req.user._id;

    await assignment.save();

    return res.json({
      success: true,
      message: "Assignment archived.",
      data: {
        id: assignment._id,
        status: assignment.status,
        archivedAt: assignment.archivedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: DELETE DRAFT ASSIGNMENT ONLY
// DELETE /api/assignments/admin/:id
// =====================================================

export const adminDeleteAssignment = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    const hasSubmissions = await AssignmentSubmission.exists({
      assignment_id: assignment._id,
      submissionCount: {
        $gt: 0,
      },
    });

    if (assignment.status !== "Draft" || hasSubmissions) {
      return fail(
        res,
        409,
        "Only Draft assignments without submissions can be permanently deleted."
      );
    }

    await assignment.deleteOne();

    await AssignmentSubmission.deleteMany({
      assignment_id: assignment._id,
    });

    await removeFiles(assignment.attachments);

    return res.json({
      success: true,
      message: "Draft assignment deleted.",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: ADD REFERENCE ATTACHMENTS
// POST /api/assignments/admin/:id/attachments
// =====================================================

export const adminAddAssignmentAttachments = async (
  req,
  res,
  next
) => {
  const files = req.files || [];

  try {
    if (!validId(req.params.id)) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 400, "Invalid assignment ID.");
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 404, "Assignment not found.");
    }

    if (assignment.status !== "Draft") {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        409,
        "Attachments can only be added to Draft assignments."
      );
    }

    if (!files.length) {
      return fail(res, 400, "Select at least one file.");
    }

    if (assignment.attachments.length + files.length > 20) {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        400,
        "An assignment can contain at most 20 attachments."
      );
    }

    assignment.attachments.push(
      ...uploadedMetadata(files)
    );

    assignment.updatedBy = req.user._id;

    await assignment.save();

    return res.json({
      success: true,
      message: "Assignment attachments added.",
    });
  } catch (error) {
    await removeFiles(uploadedMetadata(files));
    next(error);
  }
};

// =====================================================
// ADMIN: REMOVE REFERENCE ATTACHMENT
// DELETE /api/assignments/admin/:id/attachments/:fileId
// =====================================================

export const adminRemoveAssignmentAttachment = async (
  req,
  res,
  next
) => {
  try {
    if (
      !validId(req.params.id) ||
      !validId(req.params.fileId)
    ) {
      return fail(
        res,
        400,
        "Invalid assignment or file ID."
      );
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    if (assignment.status !== "Draft") {
      return fail(
        res,
        409,
        "Attachments can only be removed from Draft assignments."
      );
    }

    const attachment = assignment.attachments.id(
      req.params.fileId
    );

    if (!attachment) {
      return fail(res, 404, "Attachment not found.");
    }

    const storedName = attachment.storedName;

    attachment.deleteOne();

    await assignment.save();

    await removeFiles([{ storedName }]);

    return res.json({
      success: true,
      message: "Attachment removed.",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: ELIGIBLE STUDENTS AND SUBMISSION STATUS
// GET /api/assignments/admin/:id/submissions
// =====================================================

export const adminGetAssignmentSubmissions = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    /*
     * Refresh eligible student trackers before listing submissions.
     * This also picks up students who received an Active admission
     * after the assignment was originally published.
     */
    await initializeEligibleTrackers(assignment);

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const filter = {
      assignment_id: assignment._id,
    };

    if (req.query.status) {
      const allowed = [
        "Pending",
        "Submitted",
        "Late",
        "UnderEvaluation",
        "Evaluated",
      ];

      if (!allowed.includes(req.query.status)) {
        return fail(res, 400, "Invalid submission status.");
      }

      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
    //   AssignmentSubmission.find(filter)
    //     .populate(
    //       "student_id",
    //       "firstName surname rollNo email mobile"
    //     )
    //     .populate("admission_id", "batch_id")
    //     .populate("latestVersion_id")
    //     .sort({ updatedAt: -1 })
    //     .skip((page - 1) * limit)
    //     .limit(limit)
    //     .lean(),

    AssignmentSubmission.find(filter)
        .populate(
            "student_id",
            "firstName surname rollNo email mobile"
        )
        .populate({
            path: "admission_id",
            select: "batch_id",
            populate: {
            path: "batch_id",
            select: "batch_name status",
            },
        })
        .populate("latestVersion_id")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      AssignmentSubmission.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        submissions: items,
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


// =====================================================
// ADMIN: GET ALL VERSIONS FOR ONE STUDENT SUBMISSION
// GET /api/assignments/admin/:id/submissions/:submissionId/history
// =====================================================

export const adminGetSubmissionHistory = async (
  req,
  res,
  next
) => {
  try {
    const { id, submissionId } = req.params;

    if (!validId(id) || !validId(submissionId)) {
      return fail(
        res,
        400,
        "Invalid assignment or submission ID."
      );
    }

    const assignment = await Assignment.findById(id)
      .select("_id title status");

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      assignment_id: assignment._id,
    }).select("_id student_id assignment_id");

    if (!submission) {
      return fail(
        res,
        404,
        "Submission does not belong to this assignment."
      );
    }

    const versions = await AssignmentSubmissionVersion.find({
      submission_id: submission._id,
      assignment_id: assignment._id,
      student_id: submission.student_id,
    })
      .sort({ versionNumber: -1 })
      .lean();

    return res.json({
      success: true,
      data: versions.map((version) => ({
        id: String(version._id),
        versionNumber: version.versionNumber,
        comment: version.comment || "",
        submittedAt: version.submittedAt,
        isLate: Boolean(version.isLate),

        files: (version.files || []).map((file) => ({
          id: String(file._id),
          originalName: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// ADMIN: ENABLE / DISABLE RESUBMISSION FOR ONE STUDENT
// PATCH /api/assignments/admin/:id/submissions/:submissionId/resubmission
// =====================================================

export const adminSetStudentResubmission = async (
  req,
  res,
  next
) => {
  try {
    const { id, submissionId } = req.params;

    if (!validId(id) || !validId(submissionId)) {
      return fail(
        res,
        400,
        "Invalid assignment or submission ID."
      );
    }

    if (typeof req.body.enabled !== "boolean") {
      return fail(
        res,
        400,
        "enabled must be true or false."
      );
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    if (
      !assignment.allowResubmission &&
      req.body.enabled
    ) {
      return fail(
        res,
        409,
        "Enable resubmission on the assignment before enabling it for an individual student."
      );
    }

    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      assignment_id: id,
    });

    if (!submission) {
      return fail(
        res,
        404,
        "Submission tracker not found."
      );
    }

    submission.resubmissionEnabled = req.body.enabled;

    await submission.save();

    return res.json({
      success: true,
      message: req.body.enabled
        ? "Resubmission enabled for this student."
        : "Resubmission disabled for this student.",
      data: {
        submissionId: submission._id,
        resubmissionEnabled: submission.resubmissionEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// STUDENT: LIST MY ASSIGNMENTS
// GET /api/assignments/student
// =====================================================

export const studentGetAssignments = async (
  req,
  res,
  next
) => {
  try {
    const result = await getStudent(req);

    if (result.error) {
      return fail(
        res,
        result.error.status,
        result.error.message
      );
    }

    const admissions = await StudentAdmission.find({
      student_id: result.student._id,
      status: "Active",
    })
      .select("course_id batch_id")
      .lean();

    if (!admissions.length) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const courseIds = [
      ...new Set(
        admissions.map((item) => String(item.course_id))
      ),
    ];

    const assignments = await populateAssignment(
      Assignment.find({
        course_id: {
          $in: courseIds,
        },
        status: "Published",
      }).sort({ dueAt: 1 })
    ).lean();

    const eligible = assignments.filter((assignment) =>
      admissions.some((admission) => {
        if (
          String(admission.course_id) !==
          String(assignment.course_id._id)
        ) {
          return false;
        }

        return (
          !assignment.batch_ids.length ||
          assignment.batch_ids.some(
            (batch) =>
              String(batch._id) ===
              String(admission.batch_id)
          )
        );
      })
    );

    const trackers = await AssignmentSubmission.find({
      assignment_id: {
        $in: eligible.map((item) => item._id),
      },
      student_id: result.student._id,
    }).lean();

    const trackerMap = new Map(
      trackers.map((item) => [
        String(item.assignment_id),
        item,
      ])
    );

    return res.json({
      success: true,
      data: eligible.map((assignment) => ({
        ...serializeAssignment(assignment),
        submission:
          trackerMap.get(String(assignment._id)) || null,
        isPastDue: new Date() > new Date(assignment.dueAt),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// STUDENT: ASSIGNMENT DETAIL
// GET /api/assignments/student/:id
// =====================================================

export const studentGetAssignment = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const studentResult = await getStudent(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const access = await getAssignmentForStudent(
      req.params.id,
      studentResult.student._id
    );

    if (access.error) {
      return fail(res, access.status, access.error);
    }

    const assignment = await populateAssignment(
      Assignment.findById(access.assignment._id)
    ).lean();

    const submission = await AssignmentSubmission.findOne({
      assignment_id: assignment._id,
      student_id: studentResult.student._id,
    })
      .populate("latestVersion_id")
      .lean();

    const evaluation = submission
      ? await AssignmentEvaluation.findOne({
          submission_id: submission._id,
          status: "Published",
        }).lean()
      : null;

    return res.json({
      success: true,
      data: {
        assignment: serializeAssignment(assignment),
        submission,
        evaluation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// STUDENT: SUBMIT / RESUBMIT ASSIGNMENT
// POST /api/assignments/student/:id/submit
// multipart/form-data: files[]
// =====================================================

export const studentSubmitAssignment = async (
  req,
  res,
  next
) => {
  const files = req.files || [];

  try {
    if (!validId(req.params.id)) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, 400, "Invalid assignment ID.");
    }

    if (!files.length) {
      return fail(
        res,
        400,
        "Upload at least one submission file."
      );
    }

    const studentResult = await getStudent(req);

    if (studentResult.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const access = await getAssignmentForStudent(
      req.params.id,
      studentResult.student._id
    );

    if (access.error) {
      await removeFiles(uploadedMetadata(files));

      return fail(res, access.status, access.error);
    }

    const assignment = access.assignment;
    const now = new Date();

    const isLate = now > new Date(assignment.dueAt);

    if (isLate && !assignment.allowLateSubmission) {
      await removeFiles(uploadedMetadata(files));

      return fail(
        res,
        409,
        "The submission deadline has passed."
      );
    }

    let tracker = await AssignmentSubmission.findOne({
      assignment_id: assignment._id,
      student_id: studentResult.student._id,
    });

    if (!tracker) {
      tracker = await AssignmentSubmission.create({
        assignment_id: assignment._id,
        student_id: studentResult.student._id,
        admission_id: access.admission._id,
        status: "Pending",
      });
    }

    if (tracker.submissionCount > 0) {
      if (
        !assignment.allowResubmission ||
        !tracker.resubmissionEnabled
      ) {
        await removeFiles(uploadedMetadata(files));

        return fail(
          res,
          409,
          "Resubmission is not enabled for your account."
        );
      }
    }

    const nextVersion = tracker.submissionCount + 1;

    const version = await AssignmentSubmissionVersion.create({
      assignment_id: assignment._id,
      submission_id: tracker._id,
      student_id: studentResult.student._id,
      versionNumber: nextVersion,
      comment: String(req.body.comment || "")
        .trim()
        .slice(0, 5000),
      files: uploadedMetadata(files),
      submittedAt: now,
      isLate,
    });

    tracker.latestVersion_id = version._id;
    tracker.submissionCount = nextVersion;

    tracker.firstSubmittedAt =
      tracker.firstSubmittedAt || now;

    tracker.lastSubmittedAt = now;
    tracker.isLate = isLate;
    tracker.status = isLate ? "Late" : "Submitted";
    tracker.resubmissionEnabled = false;

    await tracker.save();

    // A new version invalidates the previous published evaluation.
    await AssignmentEvaluation.updateOne(
      {
        submission_id: tracker._id,
      },
      {
        $set: {
          status: "Draft",
          publishedAt: null,
          publishedBy: null,
          submissionVersion_id: version._id,
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: `Assignment submitted successfully (version ${nextVersion}).`,
      data: {
        submissionId: tracker._id,
        versionId: version._id,
        versionNumber: nextVersion,
        submittedAt: now,
        isLate,
        status: tracker.status,
      },
    });
  } catch (error) {
    await removeFiles(uploadedMetadata(files));
    next(error);
  }
};

// =====================================================
// STUDENT: MY SUBMISSION VERSION HISTORY
// GET /api/assignments/student/:id/history
// =====================================================

export const studentGetAssignmentHistory = async (
  req,
  res,
  next
) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid assignment ID.");
    }

    const studentResult = await getStudent(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const access = await getAssignmentForStudent(
      req.params.id,
      studentResult.student._id
    );

    if (access.error) {
      return fail(res, access.status, access.error);
    }

    const tracker = await AssignmentSubmission.findOne({
      assignment_id: req.params.id,
      student_id: studentResult.student._id,
    }).lean();

    if (!tracker) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const versions = await AssignmentSubmissionVersion.find({
      submission_id: tracker._id,
    })
      .sort({ versionNumber: -1 })
      .lean();

    return res.json({
      success: true,
      data: versions.map((version) => ({
        id: version._id,
        versionNumber: version.versionNumber,
        comment: version.comment,
        submittedAt: version.submittedAt,
        isLate: version.isLate,

        files: version.files.map((file) => ({
          id: file._id,
          originalName: file.originalName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: DOWNLOAD REFERENCE FILE
// GET /api/assignments/admin/:id/files/:fileId/download
// =====================================================

export const adminDownloadAssignmentFile = async (
  req,
  res,
  next
) => {
  try {
    if (
      !validId(req.params.id) ||
      !validId(req.params.fileId)
    ) {
      return fail(
        res,
        400,
        "Invalid assignment or file ID."
      );
    }

    const assignment = await Assignment.findById(
      req.params.id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    const file = findAttachment(
      assignment,
      req.params.fileId
    );

    if (!file) {
      return fail(res, 404, "Attachment not found.");
    }

    return sendPrivateFile(res, file, true);
  } catch (error) {
    next(error);
  }
};

// =====================================================
// STUDENT: DOWNLOAD REFERENCE FILE
// GET /api/assignments/student/:id/files/:fileId/download
// =====================================================

export const studentDownloadAssignmentFile = async (
  req,
  res,
  next
) => {
  try {
    if (
      !validId(req.params.id) ||
      !validId(req.params.fileId)
    ) {
      return fail(
        res,
        400,
        "Invalid assignment or file ID."
      );
    }

    const studentResult = await getStudent(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const access = await getAssignmentForStudent(
      req.params.id,
      studentResult.student._id
    );

    if (access.error) {
      return fail(res, access.status, access.error);
    }

    const file = findAttachment(
      access.assignment,
      req.params.fileId
    );

    if (!file) {
      return fail(res, 404, "Attachment not found.");
    }

    return sendPrivateFile(res, file, true);
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: DOWNLOAD STUDENT SUBMISSION FILE
// GET /api/assignments/admin/submissions/:submissionId/files/:fileId
// =====================================================

export const adminDownloadSubmissionFile = async (
  req,
  res,
  next
) => {
  try {
    const { submissionId, fileId } = req.params;

    if (!validId(submissionId) || !validId(fileId)) {
      return fail(
        res,
        400,
        "Invalid submission or file ID."
      );
    }

    const version = await AssignmentSubmissionVersion.findOne({
      submission_id: submissionId,
      "files._id": fileId,
    });

    if (!version) {
      return fail(
        res,
        404,
        "Submission file not found."
      );
    }

    const file = version.files.id(fileId);

    return sendPrivateFile(res, file, true);
  } catch (error) {
    next(error);
  }
};


// =====================================================
// ADMIN: GET SUBMISSION EVALUATION DETAILS
// GET /api/assignments/admin/submissions/:submissionId/evaluation
// =====================================================

export const adminGetSubmissionEvaluation = async (
  req,
  res,
  next
) => {
  try {
    const { submissionId } = req.params;

    if (!validId(submissionId)) {
      return fail(res, 400, "Invalid submission ID.");
    }

    const submission = await AssignmentSubmission.findById(
      submissionId
    )
      .populate(
        "student_id",
        "firstName surname rollNo email mobile"
      )
      .populate("latestVersion_id")
      .lean();

    if (!submission || !submission.latestVersion_id) {
      return fail(res, 404, "Submitted assignment not found.");
    }

    const assignment = await Assignment.findById(
      submission.assignment_id
    )
      .populate("course_id", "courseTitle")
      .populate("subject_id", "subjectName subjectCode")
      .populate("batch_ids", "batch_name")
      .lean();

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    const evaluation = await AssignmentEvaluation.findOne({
      submission_id: submission._id,
    })
      .populate("evaluatedBy", "name email")
      .populate("publishedBy", "name email")
      .lean();

    return res.json({
      success: true,
      data: {
        assignment: {
          id: String(assignment._id),
          title: assignment.title,
          course: assignment.course_id?.courseTitle || "",
          subject: assignment.subject_id?.subjectName || "",
          total_marks: assignment.total_marks,
          dueAt: assignment.dueAt,
          status: assignment.status,
        },

        submission: {
          id: String(submission._id),
          status: submission.status,
          submissionCount: submission.submissionCount,
          firstSubmittedAt: submission.firstSubmittedAt,
          lastSubmittedAt: submission.lastSubmittedAt,
          isLate: Boolean(submission.isLate),

          student: submission.student_id
            ? {
                id: String(submission.student_id._id),
                firstName: submission.student_id.firstName || "",
                surname: submission.student_id.surname || "",
                rollNo: submission.student_id.rollNo || "",
                email: submission.student_id.email || "",
                mobile: submission.student_id.mobile || "",
              }
            : null,

          latestVersion: {
            id: String(submission.latestVersion_id._id),
            versionNumber:
              submission.latestVersion_id.versionNumber,
            comment: submission.latestVersion_id.comment || "",
            submittedAt:
              submission.latestVersion_id.submittedAt,
            isLate: Boolean(
              submission.latestVersion_id.isLate
            ),

            files: (
              submission.latestVersion_id.files || []
            ).map((file) => ({
              id: String(file._id),
              originalName: file.originalName,
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              uploadedAt: file.uploadedAt,
            })),
          },
        },

        evaluation: evaluation
          ? {
              id: String(evaluation._id),
              marksObtained: evaluation.marksObtained,
              feedback: evaluation.feedback || "",
              status: evaluation.status,
              evaluatedBy: evaluation.evaluatedBy || null,
              publishedBy: evaluation.publishedBy || null,
              publishedAt: evaluation.publishedAt,
              updatedAt: evaluation.updatedAt,
              submissionVersion_id: String(
                evaluation.submissionVersion_id
              ),
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// ADMIN: SAVE EVALUATION DRAFT
// POST /api/assignments/admin/submissions/:submissionId/evaluation
// =====================================================

export const adminSaveEvaluation = async (
  req,
  res,
  next
) => {
  try {
    const { submissionId } = req.params;

    if (!validId(submissionId)) {
      return fail(res, 400, "Invalid submission ID.");
    }

    if (
      req.body.marksObtained === undefined ||
      req.body.marksObtained === null ||
      String(req.body.marksObtained).trim() === ""
    ) {
      return fail(res, 400, "Marks obtained are required.");
    }

    const marksObtained = Number(req.body.marksObtained);
    const feedback = String(req.body.feedback || "").trim();

    if (!Number.isFinite(marksObtained) || marksObtained < 0) {
      return fail(
        res,
        400,
        "Marks must be a valid number greater than or equal to zero."
      );
    }

    if (feedback.length > 10000) {
      return fail(
        res,
        400,
        "Feedback cannot exceed 10,000 characters."
      );
    }

    const submission = await AssignmentSubmission.findById(
      submissionId
    );

    if (!submission || !submission.latestVersion_id) {
      return fail(res, 404, "Submitted assignment not found.");
    }

    const assignment = await Assignment.findById(
      submission.assignment_id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    if (marksObtained > assignment.total_marks) {
      return fail(
        res,
        400,
        `Marks cannot exceed ${assignment.total_marks}.`
      );
    }

    const latestVersion = await AssignmentSubmissionVersion.findOne({
      _id: submission.latestVersion_id,
      submission_id: submission._id,
      assignment_id: assignment._id,
    });

    if (!latestVersion) {
      return fail(
        res,
        409,
        "Latest submission version could not be verified."
      );
    }

    const evaluation =
      await AssignmentEvaluation.findOneAndUpdate(
        { submission_id: submission._id },
        {
          $set: {
            assignment_id: assignment._id,
            submissionVersion_id: latestVersion._id,
            student_id: submission.student_id,
            marksObtained,
            feedback,
            status: "Draft",
            evaluatedBy: req.user._id,
            publishedAt: null,
            publishedBy: null,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    submission.status = "UnderEvaluation";
    await submission.save();

    return res.json({
      success: true,
      message:
        "Evaluation saved as Draft. The student cannot see it yet.",
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN: PUBLISH EVALUATION
// PATCH /api/assignments/admin/submissions/:submissionId/evaluation/publish
// =====================================================

export const adminPublishEvaluation = async (
  req,
  res,
  next
) => {
  try {
    const { submissionId } = req.params;

    if (!validId(submissionId)) {
      return fail(res, 400, "Invalid submission ID.");
    }

    const submission = await AssignmentSubmission.findById(
      submissionId
    );

    if (!submission || !submission.latestVersion_id) {
      return fail(res, 404, "Submission not found.");
    }

    const evaluation = await AssignmentEvaluation.findOne({
      submission_id: submission._id,
    });

    if (!evaluation) {
      return fail(
        res,
        404,
        "Save an evaluation before publishing."
      );
    }

    if (evaluation.status === "Published") {
      return fail(
        res,
        409,
        "This evaluation has already been published."
      );
    }

    if (
      String(evaluation.submissionVersion_id) !==
      String(submission.latestVersion_id)
    ) {
      return fail(
        res,
        409,
        "This evaluation belongs to an older submission version. Re-evaluate the latest submission."
      );
    }

    const assignment = await Assignment.findById(
      submission.assignment_id
    );

    if (!assignment) {
      return fail(res, 404, "Assignment not found.");
    }

    if (
      !Number.isFinite(Number(evaluation.marksObtained)) ||
      evaluation.marksObtained < 0 ||
      evaluation.marksObtained > assignment.total_marks
    ) {
      return fail(
        res,
        400,
        "Evaluation marks are invalid for this assignment."
      );
    }

    evaluation.status = "Published";
    evaluation.publishedAt = new Date();
    evaluation.publishedBy = req.user._id;

    await evaluation.save();

    submission.status = "Evaluated";
    await submission.save();

    return res.json({
      success: true,
      message:
        "Evaluation published. The student can now view marks and feedback.",
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
};