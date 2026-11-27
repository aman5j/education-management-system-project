
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantStudentDocumentService,
} from "../services/tenantStudentDocument.service.js";

import {
  createTenantFileStorage,
} from "../services/tenantFileStorage.js";

const instituteA = {
  instituteId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  collectionPrefix: "inst_aaaaaaaaaaaaaaaaaaaaaaaa",
};

const instituteB = {
  instituteId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  collectionPrefix: "inst_bbbbbbbbbbbbbbbbbbbbbbbb",
};

const studentAId = "111111111111111111111111";
const studentBId = "222222222222222222222222";
const documentId = "333333333333333333333333";

const createStudent = (id, overrides = {}) => ({
  _id: id,
  rollNo: "EMS001",
  firstName: "Test",
  surname: "Student",
  uploadDocument: [],
  async save() {
    return this;
  },
  ...overrides,
});

const createHarness = async () => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-tenant-student-docs-")
  );

  const storage = createTenantFileStorage({ rootDir });

  const students = new Map([
    [studentAId, createStudent(studentAId)],
    [studentBId, createStudent(studentBId)],
  ]);

  const service = createTenantStudentDocumentService({
    storage,
  });

  const createRequest = ({
    institute = instituteA,
    role = "admin",
    studentRecord = null,
  } = {}) => ({
    tenantContext: institute,
    tenantUser: {
      role,
      studentRecord,
    },
    getTenantModel(modelName) {
      assert.equal(modelName, "Student");

      return {
        findById(id) {
          return students.get(String(id)) || null;
        },
      };
    },
  });

  return {
    rootDir,
    storage,
    service,
    students,
    createRequest,
    cleanup: () =>
      fs.rm(rootDir, {
        recursive: true,
        force: true,
      }),
  };
};

test("creates the fixed institute-specific student document directory", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    const directory =
      await context.service.getDocumentsDirectory(
        req.tenantContext
      );

    assert.equal(
      directory,
      path.join(
        context.rootDir,
        instituteA.collectionPrefix,
        "students",
        "documents"
      )
    );
  } finally {
    await context.cleanup();
  }
});

test("creates different document directories for different institutes", async () => {
  const context = await createHarness();

  try {
    const directoryA =
      await context.service.getDocumentsDirectory(
        instituteA
      );

    const directoryB =
      await context.service.getDocumentsDirectory(
        instituteB
      );

    assert.notEqual(directoryA, directoryB);
    assert.notEqual(path.dirname(directoryA), path.dirname(directoryB));
  } finally {
    await context.cleanup();
  }
});

test("student can list only their own documents", async () => {
  const context = await createHarness();

  try {
    const ownStudent = context.students.get(studentAId);

    ownStudent.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: "11111111-1111-4111-8111-111111111111.pdf",
        mimeType: "application/pdf",
        fileSize: 100,
        uploadedAt: new Date(),
      },
    ];

    const req = context.createRequest({
      role: "student",
      studentRecord: studentAId,
    });

    const result =
      await context.service.listStudentDocuments(req);

    assert.equal(result.student._id, studentAId);
    assert.equal(result.documents.length, 1);
    assert.equal(result.documents[0].originalName, "Identity.pdf");
  } finally {
    await context.cleanup();
  }
});

test("student cannot list another student's documents", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest({
      role: "student",
      studentRecord: studentAId,
    });

    await assert.rejects(
      context.service.listStudentDocuments(req, studentBId),
      /TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN/
    );
  } finally {
    await context.cleanup();
  }
});

test("rejects a student account without a linked Student record", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest({
      role: "student",
      studentRecord: null,
    });

    await assert.rejects(
      context.service.listStudentDocuments(req),
      /TENANT_STUDENT_RECORD_NOT_LINKED/
    );
  } finally {
    await context.cleanup();
  }
});

test("admin document access resolves Student through the tenant model accessor", async () => {
  const context = await createHarness();

  try {
    let requestedModel = null;

    const req = {
      tenantContext: instituteA,
      tenantUser: { role: "admin" },
      getTenantModel(modelName) {
        requestedModel = modelName;

        return {
          findById(id) {
            return context.students.get(String(id)) || null;
          },
        };
      },
    };

    const result =
      await context.service.listStudentDocuments(
        req,
        studentAId
      );

    assert.equal(requestedModel, "Student");
    assert.equal(result.student._id, studentAId);
  } finally {
    await context.cleanup();
  }
});

test("rejects an invalid student ID for admin access", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    await assert.rejects(
      context.service.listStudentDocuments(req, "../../outside"),
      /TENANT_DOCUMENT_STUDENT_ID_INVALID/
    );
  } finally {
    await context.cleanup();
  }
});

test("stores document metadata only after validating an existing tenant file", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    const directory =
      await context.service.getDocumentsDirectory(
        req.tenantContext
      );

    const fileName =
      context.storage.createFileName("application/pdf");

    await fs.writeFile(
      path.join(directory, fileName),
      "sample PDF data"
    );

    const result =
      await context.service.appendStudentDocuments(
        req,
        studentAId,
        [
          {
            originalName: "Identity.pdf",
            fileName,
            mimeType: "application/pdf",
            fileSize: 15,
          },
        ]
      );

    assert.equal(result.length, 1);
    assert.equal(result[0].originalName, "Identity.pdf");
    assert.equal(result[0].fileName, fileName);
    assert.equal(result[0].mimeType, "application/pdf");
    assert.equal(result[0].fileSize, 15);
    assert.match(result[0].filePath, /students\/documents\//);
  } finally {
    await context.cleanup();
  }
});

test("rejects document metadata when the physical file does not exist", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    const fileName =
      context.storage.createFileName("application/pdf");

    await assert.rejects(
      context.service.appendStudentDocuments(
        req,
        studentAId,
        [
          {
            originalName: "Identity.pdf",
            fileName,
            mimeType: "application/pdf",
            fileSize: 100,
          },
        ]
      ),
      /TENANT_DOCUMENT_FILE_MISSING/
    );

    assert.equal(
      context.students.get(studentAId).uploadDocument.length,
      0
    );
  } finally {
    await context.cleanup();
  }
});

test("rejects a file whose extension does not match its MIME type", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    const directory =
      await context.service.getDocumentsDirectory(
        req.tenantContext
      );

    const fileName =
      context.storage.createFileName("image/png");

    await fs.writeFile(
      path.join(directory, fileName),
      "sample"
    );

    await assert.rejects(
      context.service.appendStudentDocuments(
        req,
        studentAId,
        [
          {
            originalName: "Identity.pdf",
            fileName,
            mimeType: "application/pdf",
            fileSize: 6,
          },
        ]
      ),
      /TENANT_DOCUMENT_METADATA_INVALID/
    );
  } finally {
    await context.cleanup();
  }
});

test("retrieves a document only from the current institute directory", async () => {
  const context = await createHarness();

  try {
    const directoryA =
      await context.service.getDocumentsDirectory(
        instituteA
      );

    const fileName =
      context.storage.createFileName("application/pdf");

    await fs.writeFile(
      path.join(directoryA, fileName),
      "institute A file"
    );

    const reqA = context.createRequest({
      institute: instituteA,
    });

    const reqB = context.createRequest({
      institute: instituteB,
    });

    const fileA =
      await context.service.getExistingDocumentFile(
        reqA.tenantContext,
        fileName
      );

    const fileB =
      await context.service.getExistingDocumentFile(
        reqB.tenantContext,
        fileName
      );

    assert.ok(fileA);
    assert.equal(fileB, null);
  } finally {
    await context.cleanup();
  }
});

test("removes document metadata and its institute-owned file", async () => {
  const context = await createHarness();

  try {
    const req = context.createRequest();

    const directory =
      await context.service.getDocumentsDirectory(
        req.tenantContext
      );

    const fileName =
      context.storage.createFileName("application/pdf");

    const filePath = path.join(directory, fileName);

    await fs.writeFile(filePath, "sample document");

    const student = context.students.get(studentAId);

    student.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName,
        filePath,
        mimeType: "application/pdf",
        fileSize: 16,
        uploadedAt: new Date(),
      },
    ];

    const result =
      await context.service.deleteStudentDocument(
        req,
        studentAId,
        documentId
      );

    assert.equal(result.documentId, documentId);
    assert.equal(student.uploadDocument.length, 0);

    await assert.rejects(
      fs.access(filePath),
      { code: "ENOENT" }
    );
  } finally {
    await context.cleanup();
  }
});

test("does not delete another institute's file", async () => {
  const context = await createHarness();

  try {
    const directoryA =
      await context.service.getDocumentsDirectory(
        instituteA
      );

    const fileName =
      context.storage.createFileName("application/pdf");

    const filePath = path.join(directoryA, fileName);

    await fs.writeFile(filePath, "institute A file");

    const student = context.students.get(studentAId);

    student.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName,
        filePath,
        mimeType: "application/pdf",
        fileSize: 16,
      },
    ];

    const reqB = context.createRequest({
      institute: instituteB,
    });

    await assert.rejects(
      context.service.deleteStudentDocument(
        reqB,
        studentAId,
        documentId
      ),
      /ENOENT/
    );

    assert.equal(student.uploadDocument.length, 1);

    await fs.access(filePath);
  } finally {
    await context.cleanup();
  }
});
