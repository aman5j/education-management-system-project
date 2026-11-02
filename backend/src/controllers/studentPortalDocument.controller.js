import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import Student from "../models/Student.js";

const documentsDirectory = path.resolve(
  process.cwd(),
  "private_uploads",
  "students",
  "documents"
);

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getAuthenticatedStudent = async (req) => {
  if (req.user?.role !== "student") {
    return null;
  }

  const studentId = req.user?.studentRecord;

  if (!mongoose.isValidObjectId(studentId)) {
    return null;
  }

  return Student.findById(studentId)
    .select("_id rollNo firstName surname uploadDocument")
    .lean();
};

const getSafeFilePath = (document) => {
  if (!document?.fileName) return null;

  const fileName = path.basename(document.fileName);

  if (
    fileName !== document.fileName ||
    !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(fileName)
  ) {
    return null;
  }

  return path.join(documentsDirectory, fileName);
};

const findDocument = (student, documentId) => {
  if (!mongoose.isValidObjectId(documentId)) return null;

  return (student.uploadDocument || []).find(
    (document) => String(document._id) === String(documentId)
  );
};

/**
 * GET /api/student-portal/documents
 * Returns documents belonging only to the authenticated student.
 */
export const getMyDocuments = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(
        res,
        409,
        "Your login is not linked to a valid student record."
      );
    }

    const documents = Array.isArray(student.uploadDocument)
      ? [...student.uploadDocument]
          .sort(
            (a, b) =>
              new Date(b.uploadedAt || 0).getTime() -
              new Date(a.uploadedAt || 0).getTime()
          )
          .map((document) => ({
            id: String(document._id),
            originalName: document.originalName || "Document",
            mimeType: document.mimeType || "application/octet-stream",
            fileSize: Number(document.fileSize || 0),
            uploadedAt: document.uploadedAt || null,
          }))
      : [];

    return res.status(200).json({
      success: true,
      data: {
        student: {
          rollNo: student.rollNo || "",
          name: [student.firstName, student.surname]
            .filter(Boolean)
            .join(" "),
        },
        totalDocuments: documents.length,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Shared secure file response for view and download.
 */
const sendMyDocument = async (req, res, next, disposition) => {
  try {
    const student = await getAuthenticatedStudent(req);

    if (!student) {
      return fail(
        res,
        409,
        "Your login is not linked to a valid student record."
      );
    }

    const document = findDocument(student, req.params.documentId);

    if (!document) {
      return fail(res, 404, "Document not found.");
    }

    const filePath = getSafeFilePath(document);

    if (!filePath) {
      return fail(res, 400, "Invalid document file path.");
    }

    await fs.access(filePath);

    const safeName = String(document.originalName || "document")
      .replace(/[\r\n"]/g, "_")
      .slice(0, 180);

    res.setHeader(
      "Content-Type",
      document.mimeType || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
        safeName
      )}`
    );

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (disposition === "inline") {
      return res.sendFile(filePath);
    }

    return res.download(filePath, safeName);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fail(res, 404, "Document file not found on the server.");
    }

    next(error);
  }
};

export const viewMyDocument = (req, res, next) =>
  sendMyDocument(req, res, next, "inline");

export const downloadMyDocument = (req, res, next) =>
  sendMyDocument(req, res, next, "attachment");