
import fs from "node:fs/promises";
import path from "node:path";

import tenantStudentDocumentService from "../services/tenantStudentDocument.service.js";

const MAX_DOCUMENT_NAME_LENGTH = 120;

const fail = (res, status, code, message) =>
  res.status(status).json({
    success: false,
    code,
    message,
  });

const cleanupUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch(() => {})
    )
  );
};

const getRequestedStudentId = (req) => {
  if (req.tenantUser?.role === "student") {
    return undefined;
  }

  return req.params.studentId;
};

const normalizeDocumentNames = (value, fileCount) => {
  let names;

  try {
    names = JSON.parse(value || "[]");
  } catch {
    throw new Error("TENANT_DOCUMENT_NAMES_INVALID");
  }

  if (
    !Array.isArray(names) ||
    names.length !== fileCount
  ) {
    throw new Error("TENANT_DOCUMENT_NAMES_REQUIRED");
  }

  const normalized = names.map((name) =>
    typeof name === "string"
      ? name.trim()
      : ""
  );

  if (normalized.some((name) => !name)) {
    throw new Error("TENANT_DOCUMENT_NAME_EMPTY");
  }

  if (
    normalized.some(
      (name) => name.length > MAX_DOCUMENT_NAME_LENGTH
    )
  ) {
    throw new Error("TENANT_DOCUMENT_NAME_TOO_LONG");
  }

  return normalized;
};

const createDisplayName = (enteredName, originalName) => {
  const extension = path.extname(
    String(originalName || "")
  ).toLowerCase();

  const cleanName = enteredName
    .replace(/[\\/]/g, "-")
    .replace(/\.[^/.]+$/, "")
    .trim();

  return `${cleanName}${extension}`;
};

const mapServiceError = (res, error) => {
  const code = error?.message || error?.code;

  const knownErrors = {
    TENANT_CONTEXT_UNAVAILABLE: {
      status: 503,
      message: "Institute context is unavailable.",
    },
    TENANT_MODEL_ACCESSOR_UNAVAILABLE: {
      status: 503,
      message: "Institute data services are unavailable.",
    },
    TENANT_STUDENT_RECORD_NOT_LINKED: {
      status: 409,
      message: "Your login is not linked to a valid student record.",
    },
    TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN: {
      status: 403,
      message: "You cannot access another student's documents.",
    },
    TENANT_DOCUMENT_ACCESS_FORBIDDEN: {
      status: 403,
      message: "You are not authorized to access these documents.",
    },
    TENANT_STUDENT_ACCESS_REQUIRED: {
      status: 403,
      message: "Student access is required.",
    },
    TENANT_DOCUMENT_STUDENT_ID_INVALID: {
      status: 400,
      message: "Invalid student ID.",
    },
    TENANT_DOCUMENT_ID_INVALID: {
      status: 400,
      message: "Invalid document ID.",
    },
    TENANT_DOCUMENT_BATCH_INVALID: {
      status: 400,
      message: "The document upload batch is invalid.",
    },
    TENANT_DOCUMENT_METADATA_INVALID: {
      status: 400,
      message: "Document information is invalid.",
    },
    TENANT_DOCUMENT_FILE_MISSING: {
      status: 400,
      message: "An uploaded document file is missing.",
    },
    TENANT_DOCUMENT_FILE_NAME_INVALID: {
      status: 400,
      message: "The document file name is invalid.",
    },
    TENANT_DOCUMENT_PATH_INVALID: {
      status: 400,
      message: "The document file path is invalid.",
    },
    TENANT_DOCUMENT_STORAGE_INVALID: {
      status: 503,
      message: "Document storage is unavailable.",
    },
  };

  const known = knownErrors[code];

  if (!known) {
    return false;
  }

  fail(res, known.status, code, known.message);
  return true;
};

export const createTenantStudentDocumentController = ({
  service = tenantStudentDocumentService,
} = {}) => {
  if (
    !service ||
    typeof service.listStudentDocuments !== "function" ||
    typeof service.getStudentDocument !== "function" ||
    typeof service.appendStudentDocuments !== "function" ||
    typeof service.deleteStudentDocument !== "function"
  ) {
    throw new Error(
      "TENANT_DOCUMENT_CONTROLLER_CONFIG_INVALID"
    );
  }

  const getDocuments = async (req, res, next) => {
    try {
      const result = await service.listStudentDocuments(
        req,
        getRequestedStudentId(req)
      );

      if (!result) {
        return fail(
          res,
          404,
          "TENANT_STUDENT_NOT_FOUND",
          "Student not found."
        );
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (mapServiceError(res, error)) return;
      return next(error);
    }
  };

  const uploadDocuments = async (req, res, next) => {
    const files = req.files || [];

    try {
      if (!files.length) {
        return fail(
          res,
          400,
          "TENANT_DOCUMENT_REQUIRED",
          "Please select at least one document."
        );
      }

      const names = normalizeDocumentNames(
        req.body?.documentNames,
        files.length
      );

      const documents = files.map((file, index) => ({
        originalName: createDisplayName(
          names[index],
          file.originalname
        ),
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date(),
      }));

      const result = await service.appendStudentDocuments(
        req,
        getRequestedStudentId(req),
        documents
      );

      if (!result) {
        await cleanupUploadedFiles(files);

        return fail(
          res,
          404,
          "TENANT_STUDENT_NOT_FOUND",
          "Student not found."
        );
      }

      return res.status(201).json({
        success: true,
        message: `${files.length} document${
          files.length === 1 ? "" : "s"
        } uploaded successfully.`,
        data: {
          documents: result,
        },
      });
    } catch (error) {
      await cleanupUploadedFiles(files);

      const code = error?.message;

      const requestErrors = {
        TENANT_DOCUMENT_NAMES_INVALID: [
          400,
          "Document names data is invalid.",
        ],
        TENANT_DOCUMENT_NAMES_REQUIRED: [
          400,
          "Please provide a name for every selected document.",
        ],
        TENANT_DOCUMENT_NAME_EMPTY: [
          400,
          "Every document must have a name.",
        ],
        TENANT_DOCUMENT_NAME_TOO_LONG: [
          400,
          "Document names cannot exceed 120 characters.",
        ],
      };

      if (requestErrors[code]) {
        const [status, message] = requestErrors[code];

        return fail(res, status, code, message);
      }

      if (mapServiceError(res, error)) return;
      return next(error);
    }
  };

  const sendDocument = async (
    req,
    res,
    next,
    disposition
  ) => {
    try {
      const result = await service.getStudentDocument(
        req,
        getRequestedStudentId(req),
        req.params.documentId
      );

      if (!result) {
        return fail(
          res,
          404,
          "TENANT_DOCUMENT_NOT_FOUND",
          "Student or document not found."
        );
      }

      if (!result.file) {
        return fail(
          res,
          404,
          "TENANT_DOCUMENT_FILE_MISSING",
          "Document file not found on the server."
        );
      }

      const document = result.document;

      const safeName = String(
        document.originalName || "document"
      )
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

      return res.sendFile(result.file.path);
    } catch (error) {
      if (error.code === "ENOENT") {
        return fail(
          res,
          404,
          "TENANT_DOCUMENT_FILE_MISSING",
          "Document file not found on the server."
        );
      }

      if (mapServiceError(res, error)) return;
      return next(error);
    }
  };

  const viewDocument = (req, res, next) =>
    sendDocument(req, res, next, "inline");

  const downloadDocument = (req, res, next) =>
    sendDocument(req, res, next, "attachment");

  const deleteDocument = async (req, res, next) => {
    try {
      const result = await service.deleteStudentDocument(
        req,
        getRequestedStudentId(req),
        req.params.documentId
      );

      if (!result) {
        return fail(
          res,
          404,
          "TENANT_DOCUMENT_NOT_FOUND",
          "Student or document not found."
        );
      }

      return res.status(200).json({
        success: true,
        message: "Document deleted successfully.",
        data: result,
      });
    } catch (error) {
      if (mapServiceError(res, error)) return;
      return next(error);
    }
  };

  return Object.freeze({
    getDocuments,
    uploadDocuments,
    viewDocument,
    downloadDocument,
    deleteDocument,
  });
};

const tenantDocumentController =
  createTenantStudentDocumentController();

export const getTenantStudentDocuments =
  tenantDocumentController.getDocuments;

export const uploadTenantStudentDocuments =
  tenantDocumentController.uploadDocuments;

export const viewTenantStudentDocument =
  tenantDocumentController.viewDocument;

export const downloadTenantStudentDocument =
  tenantDocumentController.downloadDocument;

export const deleteTenantStudentDocument =
  tenantDocumentController.deleteDocument;
