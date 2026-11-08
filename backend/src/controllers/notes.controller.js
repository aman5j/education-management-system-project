import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import Note from "../models/Note.js";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";

import {
  NOTES_UPLOAD_DIRECTORY,
} from "../middleware/notesUpload.middleware.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const isValidId = (id) => mongoose.isValidObjectId(id);

const removeStoredFiles = async (files = []) => {
  await Promise.all(
    files.map((file) => {
      const storedName = path.basename(file.storedName || "");

      if (!storedName) return Promise.resolve();

      return fs
        .unlink(path.join(NOTES_UPLOAD_DIRECTORY, storedName))
        .catch(() => {});
    })
  );
};

const getUploadedAttachments = (files = []) =>
  files.map((file) => ({
    originalName: path.basename(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  }));

const serializeNote = (note) => ({
  id: String(note._id),
  title: note.title,
  description: note.description || "",
  course: note.course_id
    ? {
        id: String(note.course_id._id || note.course_id),
        title: note.course_id.courseTitle || "",
      }
    : null,
  subject: note.subject_id
    ? {
        id: String(note.subject_id._id || note.subject_id),
        name: note.subject_id.subjectName || "",
        code: note.subject_id.subjectCode || "",
      }
    : null,
  status: note.status,
  attachments: (note.attachments || []).map((file) => ({
    id: String(file._id),
    originalName: file.originalName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    uploadedAt: file.uploadedAt,
  })),
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  publishedAt: note.publishedAt || null,
});

const populateNote = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate("subject_id", "subjectName subjectCode");

const validateCourseSubject = async (courseId, subjectId) => {
  if (!isValidId(courseId)) {
    return {
      valid: false,
      message: "A valid course_id is required.",
    };
  }

  const course = await Course.findById(courseId).select(
    "_id courseTitle subjects"
  );

  if (!course) {
    return {
      valid: false,
      message: "Course not found.",
    };
  }

  // Subject is optional. No subject-course validation is needed
  // when the note is intended for the entire course.
  if (!subjectId) {
    return {
      valid: true,
      course,
      subject: null,
    };
  }

  if (!isValidId(subjectId)) {
    return {
      valid: false,
      message: "Invalid subject_id.",
    };
  }

  const subject = await Subject.findById(subjectId).select(
    "_id subjectName subjectCode status"
  );

  if (!subject) {
    return {
      valid: false,
      message: "Subject not found.",
    };
  }

  if (subject.status !== "Active") {
    return {
      valid: false,
      message: "The selected subject is inactive.",
    };
  }

  const belongsToCourse = (course.subjects || []).some(
    (id) => String(id) === String(subject._id)
  );

  if (!belongsToCourse) {
    return {
      valid: false,
      message: "The selected subject does not belong to this course.",
    };
  }

  return {
    valid: true,
    course,
    subject,
  };
};

const getStudentRecord = async (req) => {
  const studentId = req.user?.studentRecord;

  if (!studentId || !isValidId(studentId)) {
    return {
      error: {
        status: 409,
        message:
          "Your login account is not linked to a valid student record. Please contact your institute administrator.",
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
        message: "Your student record is inactive or unavailable.",
      },
    };
  }

  return { student };
};

const getActiveCourseIds = async (studentId) => {
  const admissions = await StudentAdmission.find({
    student_id: studentId,
    status: "Active",
  })
    .select("course_id")
    .lean();

  return [
    ...new Set(
      admissions
        .map((admission) =>
          admission.course_id ? String(admission.course_id) : null
        )
        .filter(Boolean)
    ),
  ];
};

const findAttachment = (note, fileId) => {
  if (!isValidId(fileId)) return null;

  return (
    note.attachments.id(fileId) ||
    null
  );
};

const sendAttachment = async (req, res, note, fileId, download) => {
  const attachment = findAttachment(note, fileId);

  if (!attachment) {
    return fail(res, 404, "Attachment not found.");
  }

  const storedName = path.basename(attachment.storedName || "");
  const filePath = path.resolve(NOTES_UPLOAD_DIRECTORY, storedName);

  if (
    !storedName ||
    path.dirname(filePath) !== NOTES_UPLOAD_DIRECTORY
  ) {
    return fail(res, 404, "Attachment file is unavailable.");
  }

  try {
    await fs.access(filePath);
  } catch {
    return fail(res, 404, "Attachment file is missing from storage.");
  }

  res.setHeader(
    "Content-Type",
    attachment.mimeType || "application/octet-stream"
  );

  if (download) {
    const safeName = String(attachment.originalName || "attachment")
      .replace(/[\r\n"]/g, "_");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    );
  } else {
    res.setHeader(
      "Content-Disposition",
      "inline"
    );
  }

  return res.sendFile(filePath);
};

// ----------------------------------------------------
// ADMIN: LIST NOTES
// GET /api/notes
// ----------------------------------------------------

export const getNotes = async (req, res, next) => {
  try {
    const {
      search = "",
      courseId,
      subjectId,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = {};

    if (courseId) {
      if (!isValidId(courseId)) {
        return fail(res, 400, "Invalid courseId.");
      }

      filter.course_id = courseId;
    }

    if (subjectId) {
      if (!isValidId(subjectId)) {
        return fail(res, 400, "Invalid subjectId.");
      }

      filter.subject_id = subjectId;
    }

    if (status) {
      if (!["Draft", "Published"].includes(status)) {
        return fail(res, 400, "Invalid note status.");
      }

      filter.status = status;
    }

    const searchText = String(search).trim();

    if (searchText) {
      const escapedSearch = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.title = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * pageSize;

    const [
      notes,
      total,
      totalNotes,
      publishedNotes,
      draftNotes,
    ] = await Promise.all([
      populateNote(
        Note.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(pageSize)
      ).lean(),

      Note.countDocuments(filter),

      // Global statistics: independent of search and filters.
      Note.countDocuments({}),

      Note.countDocuments({ status: "Published" }),

      Note.countDocuments({ status: "Draft" }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notes: notes.map(serializeNote),

        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },

        stats: {
          total: totalNotes,
          published: publishedNotes,
          drafts: draftNotes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: GET ONE NOTE
// GET /api/notes/:id
// ----------------------------------------------------

export const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const note = await populateNote(
      Note.findById(id)
    ).lean();

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    return res.status(200).json({
      success: true,
      data: {
        note: serializeNote(note),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: CREATE NOTE
// POST /api/notes
// ----------------------------------------------------

export const createNote = async (req, res, next) => {
  const uploadedFiles = req.files || [];

  try {
    const {
      title,
      description = "",
      course_id,
      subject_id,
    } = req.body;

    if (!String(title || "").trim()) {
      await removeStoredFiles(
        getUploadedAttachments(uploadedFiles)
      );

      return fail(res, 400, "Note title is required.");
    }

    if (!uploadedFiles.length) {
      return fail(
        res,
        400,
        "Upload at least one attachment when creating a note."
      );
    }

    const validation = await validateCourseSubject(
      course_id,
      subject_id
    );

    if (!validation.valid) {
      await removeStoredFiles(
        getUploadedAttachments(uploadedFiles)
      );

      return fail(res, 400, validation.message);
    }

    const note = await Note.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      course_id: validation.course._id,
      subject_id: validation.subject?._id || null,
      attachments: getUploadedAttachments(uploadedFiles),
      status: "Draft",
      createdBy: req.user._id,
    });

    const populated = await populateNote(
      Note.findById(note._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Note created successfully as Draft.",
      data: {
        note: serializeNote(populated),
      },
    });
  } catch (error) {
    await removeStoredFiles(
      getUploadedAttachments(uploadedFiles)
    );

    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: UPDATE NOTE DETAILS
// PUT /api/notes/:id
// ----------------------------------------------------

export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    const {
      title,
      description,
      course_id,
      subject_id,
    } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return fail(res, 400, "Note title cannot be empty.");
      }

      note.title = String(title).trim();
    }

    if (description !== undefined) {
      note.description = String(description || "").trim();
    }

    if (course_id !== undefined || subject_id !== undefined) {
      const nextCourseId =
        course_id !== undefined
          ? course_id
          : note.course_id;

      const nextSubjectId =
        subject_id !== undefined
          ? subject_id
          : note.subject_id;

      const validation = await validateCourseSubject(
        nextCourseId,
        nextSubjectId
      );

      if (!validation.valid) {
        return fail(res, 400, validation.message);
      }

      note.course_id = validation.course._id;
      note.subject_id = validation.subject?._id || null;
    }

    await note.save();

    const populated = await populateNote(
      Note.findById(note._id)
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Note updated successfully.",
      data: {
        note: serializeNote(populated),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: ADD ATTACHMENTS
// POST /api/notes/:id/attachments
// ----------------------------------------------------

export const addNoteAttachments = async (req, res, next) => {
  const uploadedFiles = req.files || [];

  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      await removeStoredFiles(
        getUploadedAttachments(uploadedFiles)
      );

      return fail(res, 400, "Invalid note ID.");
    }

    if (!uploadedFiles.length) {
      return fail(res, 400, "Select at least one attachment.");
    }

    const note = await Note.findById(id);

    if (!note) {
      await removeStoredFiles(
        getUploadedAttachments(uploadedFiles)
      );

      return fail(res, 404, "Note not found.");
    }

    if (note.attachments.length + uploadedFiles.length > 20) {
      await removeStoredFiles(
        getUploadedAttachments(uploadedFiles)
      );

      return fail(
        res,
        400,
        "A note can contain a maximum of 20 attachments."
      );
    }

    note.attachments.push(
      ...getUploadedAttachments(uploadedFiles)
    );

    await note.save();

    const populated = await populateNote(
      Note.findById(note._id)
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Attachments added successfully.",
      data: {
        note: serializeNote(populated),
      },
    });
  } catch (error) {
    await removeStoredFiles(
      getUploadedAttachments(uploadedFiles)
    );

    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: REMOVE ONE ATTACHMENT
// DELETE /api/notes/:id/attachments/:fileId
// ----------------------------------------------------

export const removeNoteAttachment = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;

    if (!isValidId(id) || !isValidId(fileId)) {
      return fail(res, 400, "Invalid note or attachment ID.");
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    const attachment = findAttachment(note, fileId);

    if (!attachment) {
      return fail(res, 404, "Attachment not found.");
    }

    // A published note must always have at least one attachment.
    if (note.status === "Published" && note.attachments.length === 1) {
      return fail(
        res,
        400,
        "A published note must contain at least one attachment. Change it to Draft first."
      );
    }

    const storedName = attachment.storedName;

    attachment.deleteOne();
    await note.save();

    await removeStoredFiles([{ storedName }]);

    return res.status(200).json({
      success: true,
      message: "Attachment removed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: PUBLISH OR UNPUBLISH
// PATCH /api/notes/:id/status
// ----------------------------------------------------

export const updateNoteStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    if (!["Draft", "Published"].includes(status)) {
      return fail(
        res,
        400,
        "Status must be Draft or Published."
      );
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    if (status === "Published" && !note.attachments.length) {
      return fail(
        res,
        400,
        "Add at least one attachment before publishing."
      );
    }

    note.status = status;
    note.publishedAt =
      status === "Published" ? new Date() : null;

    await note.save();

    return res.status(200).json({
      success: true,
      message:
        status === "Published"
          ? "Note published successfully."
          : "Note moved to Draft successfully.",
      data: {
        id: String(note._id),
        status: note.status,
        publishedAt: note.publishedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: DELETE NOTE
// DELETE /api/notes/:id
// ----------------------------------------------------

export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    const attachments = note.attachments.map((file) => ({
      storedName: file.storedName,
    }));

    await note.deleteOne();
    await removeStoredFiles(attachments);

    return res.status(200).json({
      success: true,
      message: "Note and its attachments deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// STUDENT: LIST PUBLISHED NOTES
// GET /api/notes/student
// ----------------------------------------------------

export const getStudentNotes = async (req, res, next) => {
  try {
    const studentResult = await getStudentRecord(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const studentId = studentResult.student._id;
    const courseIds = await getActiveCourseIds(studentId);

    if (!courseIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          notes: [],
        },
      });
    }

    const filter = {
      course_id: { $in: courseIds },
      status: "Published",
    };

    if (req.query.courseId) {
      if (!isValidId(req.query.courseId)) {
        return fail(res, 400, "Invalid courseId.");
      }

      if (!courseIds.includes(String(req.query.courseId))) {
        return fail(
          res,
          403,
          "You do not have an Active admission for this course."
        );
      }

      filter.course_id = req.query.courseId;
    }

    if (req.query.subjectId) {
        if (!isValidId(req.query.subjectId)) {
            return fail(res, 400, "Invalid subjectId.");
        }

        // Show notes for the selected subject AND general course notes
        // that do not have a subject assigned.
        filter.$or = [
            { subject_id: req.query.subjectId },
            { subject_id: null },
        ];
    }

    const notes = await populateNote(
      Note.find(filter).sort({ publishedAt: -1, createdAt: -1 })
    ).lean();

    return res.status(200).json({
      success: true,
      data: {
        notes: notes.map(serializeNote),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// STUDENT: GET ONE PUBLISHED NOTE
// GET /api/notes/student/:id
// ----------------------------------------------------

export const getStudentNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const studentResult = await getStudentRecord(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const note = await populateNote(
      Note.findOne({
        _id: id,
        status: "Published",
      })
    ).lean();

    if (!note) {
      return fail(res, 404, "Published note not found.");
    }

    const hasAdmission = await StudentAdmission.exists({
      student_id: studentResult.student._id,
      course_id: note.course_id?._id,
      status: "Active",
    });

    if (!hasAdmission) {
      return fail(
        res,
        403,
        "You do not have an Active admission for this note's course."
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        note: serializeNote(note),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// ADMIN: VIEW / DOWNLOAD ATTACHMENT
// ----------------------------------------------------

export const adminViewNoteAttachment = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    return sendAttachment(req, res, note, fileId, false);
  } catch (error) {
    next(error);
  }
};

export const adminDownloadNoteAttachment = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;

    if (!isValidId(id)) {
      return fail(res, 400, "Invalid note ID.");
    }

    const note = await Note.findById(id);

    if (!note) {
      return fail(res, 404, "Note not found.");
    }

    return sendAttachment(req, res, note, fileId, true);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// STUDENT: VIEW / DOWNLOAD ATTACHMENT
// ----------------------------------------------------

const studentAttachmentAccess = async (req, res, next, download) => {
  try {
    const { id, fileId } = req.params;

    if (!isValidId(id) || !isValidId(fileId)) {
      return fail(res, 400, "Invalid note or attachment ID.");
    }

    const studentResult = await getStudentRecord(req);

    if (studentResult.error) {
      return fail(
        res,
        studentResult.error.status,
        studentResult.error.message
      );
    }

    const note = await Note.findOne({
      _id: id,
      status: "Published",
    });

    if (!note) {
      return fail(res, 404, "Published note not found.");
    }

    const hasAdmission = await StudentAdmission.exists({
      student_id: studentResult.student._id,
      course_id: note.course_id,
      status: "Active",
    });

    if (!hasAdmission) {
      return fail(
        res,
        403,
        "You do not have an Active admission for this note's course."
      );
    }

    return sendAttachment(req, res, note, fileId, download);
  } catch (error) {
    next(error);
  }
};

export const studentViewNoteAttachment = (req, res, next) =>
  studentAttachmentAccess(req, res, next, false);

export const studentDownloadNoteAttachment = (req, res, next) =>
  studentAttachmentAccess(req, res, next, true);