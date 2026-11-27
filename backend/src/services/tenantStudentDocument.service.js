
import fs from "node:fs/promises";
import path from "node:path";

import tenantFileStorage from "./tenantFileStorage.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

const MAX_DOCUMENT_NAME_LENGTH = 120;
const MAX_DOCUMENTS_PER_REQUEST = 10;

const MIME_EXTENSIONS = Object.freeze({
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ".xlsx",
});

const DOCUMENT_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i;

const ALLOWED_DOCUMENT_EXTENSIONS = new Set(
  Object.values(MIME_EXTENSIONS)
);

const DOCUMENT_DIRECTORY_PARTS = Object.freeze([
  "students",
  "documents",
]);

const getId = (value) => {
  if (!value) return null;

  const id =
    typeof value === "object" && value._id
      ? String(value._id)
      : String(value);

  return OBJECT_ID_PATTERN.test(id) ? id : null;
};

const getDocumentName = (value) => {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[\r\n\0]/g, "")
    .slice(0, MAX_DOCUMENT_NAME_LENGTH);
};

const getExtension = (fileName) =>
  path.extname(fileName).toLowerCase();

export const createTenantStudentDocumentService = ({
  storage = tenantFileStorage,
} = {}) => {
  if (
    !storage ||
    typeof storage.getTenantDirectory !== "function" ||
    typeof storage.ensureTenantDirectory !== "function" ||
    typeof storage.getSafeFilePath !== "function"
  ) {
    throw new Error("TENANT_DOCUMENT_STORAGE_INVALID");
  }

  const getTrustedContext = (req) => {
    if (
      !req?.tenantContext?.instituteId ||
      !req?.tenantContext?.collectionPrefix
    ) {
      throw new Error("TENANT_CONTEXT_UNAVAILABLE");
    }

    return req.tenantContext;
  };

  const getStudentModel = (req) => {
    if (typeof req?.getTenantModel !== "function") {
      throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
    }

    return req.getTenantModel("Student");
  };

  const getAuthenticatedStudentId = (req) => {
    if (req?.tenantUser?.role !== "student") {
      throw new Error("TENANT_STUDENT_ACCESS_REQUIRED");
    }

    const studentId = getId(req.tenantUser.studentRecord);

    if (!studentId) {
      throw new Error("TENANT_STUDENT_RECORD_NOT_LINKED");
    }

    return studentId;
  };

  const resolveStudentId = (req, requestedStudentId) => {
    const role = req?.tenantUser?.role;

    if (!["admin", "staff", "student"].includes(role)) {
      throw new Error("TENANT_DOCUMENT_ACCESS_FORBIDDEN");
    }

    if (role === "student") {
      const ownStudentId = getAuthenticatedStudentId(req);
      const requestedId = requestedStudentId
        ? getId(requestedStudentId)
        : ownStudentId;

      if (!requestedId || requestedId !== ownStudentId) {
        throw new Error("TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN");
      }

      return ownStudentId;
    }

    const studentId = getId(requestedStudentId);

    if (!studentId) {
      throw new Error("TENANT_DOCUMENT_STUDENT_ID_INVALID");
    }

    return studentId;
  };

  const getDocumentsDirectory = async (tenantContext) => {
    const tenantRoot = storage.getTenantDirectory(tenantContext);

    const directory = path.resolve(
      tenantRoot,
      ...DOCUMENT_DIRECTORY_PARTS
    );

    const expectedDirectory = path.resolve(
      tenantRoot,
      "students",
      "documents"
    );

    if (directory !== expectedDirectory) {
      throw new Error("TENANT_DOCUMENT_PATH_INVALID");
    }

    await fs.mkdir(directory, {
      recursive: true,
      mode: 0o700,
    });

    const [realTenantRoot, realDirectory] = await Promise.all([
      fs.realpath(tenantRoot),
      fs.realpath(directory),
    ]);

    const relative = path.relative(realTenantRoot, realDirectory);

    if (
      relative !== path.join("students", "documents") ||
      path.isAbsolute(relative) ||
      relative.startsWith(`..${path.sep}`)
    ) {
      throw new Error("TENANT_DOCUMENT_PATH_INVALID");
    }

    return realDirectory;
  };

const getSafeDocumentPath = async (
  tenantContext,
  fileName
) => {
  // Reject traversal, absolute paths and non-string values.
  if (
    typeof fileName !== "string" ||
    path.basename(fileName) !== fileName
  ) {
    throw new Error("TENANT_DOCUMENT_FILE_NAME_INVALID");
  }

  // Only server-generated UUID filenames are accepted.
  if (!DOCUMENT_FILE_NAME_PATTERN.test(fileName)) {
    throw new Error("TENANT_FILE_NAME_INVALID");
  }

  // A valid UUID must also have an extension supported by
  // the student document upload system.
  if (
    !ALLOWED_DOCUMENT_EXTENSIONS.has(
      getExtension(fileName)
    )
  ) {
    throw new Error("TENANT_FILE_NAME_INVALID");
  }

  // Keep the generic storage service's tenant/path validation.
  storage.getSafeFilePath(tenantContext, fileName);

  const directory = await getDocumentsDirectory(
    tenantContext
  );

  const filePath = path.resolve(directory, fileName);

  if (path.dirname(filePath) !== directory) {
    throw new Error("TENANT_DOCUMENT_PATH_INVALID");
  }

  return filePath;
};

  const getExistingDocumentFile = async (
    tenantContext,
    fileName
  ) => {
    const filePath = await getSafeDocumentPath(
      tenantContext,
      fileName
    );

    const stat = await fs.lstat(filePath).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });

    if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
      return null;
    }

    const realFilePath = await fs.realpath(filePath);
    const directory = await getDocumentsDirectory(tenantContext);

    if (path.dirname(realFilePath) !== directory) {
      throw new Error("TENANT_DOCUMENT_PATH_INVALID");
    }

    return {
      path: realFilePath,
      size: stat.size,
      modifiedAt: stat.mtime,
    };
  };

  const loadStudent = async (req, requestedStudentId) => {
    const tenantContext = getTrustedContext(req);
    const studentId = resolveStudentId(req, requestedStudentId);
    const Student = getStudentModel(req);

    const student = await Student.findById(studentId);

    if (!student) {
      return {
        tenantContext,
        studentId,
        student: null,
      };
    }

    return {
      tenantContext,
      studentId,
      student,
    };
  };

  const listStudentDocuments = async (req, requestedStudentId) => {
    const result = await loadStudent(req, requestedStudentId);

    if (!result.student) return null;

    const documents = Array.isArray(
      result.student.uploadDocument
    )
      ? [...result.student.uploadDocument].sort(
          (a, b) =>
            new Date(b.uploadedAt || 0).getTime() -
            new Date(a.uploadedAt || 0).getTime()
        )
      : [];

    return {
      student: {
        _id: result.student._id,
        rollNo: result.student.rollNo || "",
        name: [
          result.student.firstName,
          result.student.surname,
        ]
          .filter(Boolean)
          .join(" "),
      },
      documents,
    };
  };

  const getStudentDocument = async (
    req,
    requestedStudentId,
    documentId
  ) => {
    const result = await loadStudent(req, requestedStudentId);

    if (!result.student) return null;

    const validDocumentId = getId(documentId);

    if (!validDocumentId) {
      throw new Error("TENANT_DOCUMENT_ID_INVALID");
    }

    const document = (
      Array.isArray(result.student.uploadDocument)
        ? result.student.uploadDocument
        : []
    ).find(
      (item) => String(item._id) === validDocumentId
    );

    if (!document) return null;

    const file = await getExistingDocumentFile(
      result.tenantContext,
      document.fileName
    );

    return {
      student: result.student,
      document,
      file,
    };
  };

  const appendStudentDocuments = async (
    req,
    requestedStudentId,
    documents
  ) => {
    if (
      !Array.isArray(documents) ||
      documents.length < 1 ||
      documents.length > MAX_DOCUMENTS_PER_REQUEST
    ) {
      throw new Error("TENANT_DOCUMENT_BATCH_INVALID");
    }

    const result = await loadStudent(req, requestedStudentId);

    if (!result.student) return null;

    const directory = await getDocumentsDirectory(
      result.tenantContext
    );

    const normalizedDocuments = [];

    for (const item of documents) {
      const originalName = getDocumentName(item?.originalName);
      const fileName = item?.fileName;
      const mimeType = item?.mimeType;
      const extension = MIME_EXTENSIONS[mimeType];

      if (
        !originalName ||
        !extension ||
        typeof fileName !== "string" ||
        getExtension(fileName) !== extension ||
        !Number.isFinite(Number(item?.fileSize)) ||
        Number(item.fileSize) < 0
      ) {
        throw new Error("TENANT_DOCUMENT_METADATA_INVALID");
      }

      const filePath = await getSafeDocumentPath(
        result.tenantContext,
        fileName
      );

      const stat = await fs.lstat(filePath).catch(() => null);

      if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
        throw new Error("TENANT_DOCUMENT_FILE_MISSING");
      }

      const realPath = await fs.realpath(filePath);

      if (path.dirname(realPath) !== directory) {
        throw new Error("TENANT_DOCUMENT_PATH_INVALID");
      }

      normalizedDocuments.push({
        originalName,
        fileName,
        filePath: path
          .relative(process.cwd(), filePath)
          .replace(/\\/g, "/"),
        mimeType,
        fileSize: stat.size,
        uploadedAt: item.uploadedAt
          ? new Date(item.uploadedAt)
          : new Date(),
      });
    }

    if (!Array.isArray(result.student.uploadDocument)) {
      result.student.uploadDocument = [];
    }

    result.student.uploadDocument.push(...normalizedDocuments);

    await result.student.save();

    return result.student.uploadDocument;
  };

  const deleteStudentDocument = async (
    req,
    requestedStudentId,
    documentId
  ) => {
    const result = await loadStudent(req, requestedStudentId);

    if (!result.student) return null;

    const validDocumentId = getId(documentId);

    if (!validDocumentId) {
      throw new Error("TENANT_DOCUMENT_ID_INVALID");
    }

    const documents = Array.isArray(
      result.student.uploadDocument
    )
      ? result.student.uploadDocument
      : [];

    const document = documents.find(
      (item) => String(item._id) === validDocumentId
    );

    if (!document) return null;

    // Resolve the path before changing metadata.
    const filePath = await getSafeDocumentPath(
      result.tenantContext,
      document.fileName
    );

    result.student.uploadDocument = documents.filter(
      (item) => String(item._id) !== validDocumentId
    );

    await result.student.save();

    // Database ownership is removed first. File cleanup is best-effort:
    // a missing file must not restore a deleted document record.
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });

    return {
      documentId: validDocumentId,
    };
  };

  return Object.freeze({
    getDocumentsDirectory,
    getSafeDocumentPath,
    getExistingDocumentFile,
    listStudentDocuments,
    getStudentDocument,
    appendStudentDocuments,
    deleteStudentDocument,
  });
};

const tenantStudentDocumentService =
  createTenantStudentDocumentService();

export default tenantStudentDocumentService;
