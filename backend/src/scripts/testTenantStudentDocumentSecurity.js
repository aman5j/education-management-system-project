
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantFileStorage,
} from "../services/tenantFileStorage.js";

import {
  createTenantStudentDocumentService,
} from "../services/tenantStudentDocument.service.js";

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

const validFileName =
  "11111111-1111-4111-8111-111111111111.pdf";

const documentId =
  "333333333333333333333333";

const createStudent = (id, overrides = {}) => ({
  _id: id,
  firstName: "Test",
  surname: "Student",
  rollNo: "EMS001",
  uploadDocument: [],
  save: async function () {
    return this;
  },
  ...overrides,
});

const createHarness = async () => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-document-security-")
  );

  const storage = createTenantFileStorage({ rootDir });

  const studentsByInstitute = new Map([
    [
      instituteA.collectionPrefix,
      new Map([
        [studentAId, createStudent(studentAId)],
      ]),
    ],
    [
      instituteB.collectionPrefix,
      new Map([
        [studentBId, createStudent(studentBId)],
      ]),
    ],
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

      const students = studentsByInstitute.get(
        institute.collectionPrefix
      );

      if (!students) {
        throw new Error("TENANT_COLLECTION_NOT_FOUND");
      }

      return {
        findById(id) {
          return students.get(String(id)) || null;
        },
      };
    },
  });

  const getStudent = (institute, studentId) =>
    studentsByInstitute
      .get(institute.collectionPrefix)
      .get(studentId);

  const createPhysicalDocument = async (
    institute = instituteA,
    fileName = validFileName,
    content = "private test document"
  ) => {
    const directory =
      await service.getDocumentsDirectory(institute);

    const filePath = path.join(directory, fileName);

    await fs.writeFile(filePath, content);

    return filePath;
  };

  return {
    rootDir,
    storage,
    service,
    createRequest,
    getStudent,
    createPhysicalDocument,
    cleanup: () =>
      fs.rm(rootDir, {
        recursive: true,
        force: true,
      }),
  };
};

test("rejects missing trusted tenant context", async () => {
  const context = await createHarness();

  try {
    await assert.rejects(
      context.service.getDocumentsDirectory(null),
      /TENANT_FILE_CONTEXT_INVALID|TENANT_CONTEXT_UNAVAILABLE/
    );
  } finally {
    await context.cleanup();
  }
});

test("rejects an institute ID that does not match its collection prefix", async () => {
  const context = await createHarness();

  try {
    await assert.rejects(
      context.service.getDocumentsDirectory({
        instituteId: instituteA.instituteId,
        collectionPrefix: instituteB.collectionPrefix,
      }),
      /TENANT_FILE_PREFIX_INVALID/
    );
  } finally {
    await context.cleanup();
  }
});

test("rejects path traversal document filenames", async () => {
  const context = await createHarness();

  try {
    const unsafeNames = [
      "../outside.pdf",
      "..\\outside.pdf",
      "/outside.pdf",
      "folder/document.pdf",
      "",
    ];

    for (const fileName of unsafeNames) {
      await assert.rejects(
        context.service.getSafeDocumentPath(
          instituteA,
          fileName
        ),
        /TENANT_DOCUMENT_FILE_NAME_INVALID/
      );
    }
  } finally {
    await context.cleanup();
  }
});

test("rejects arbitrary filenames that are not server-generated UUID names", async () => {
  const context = await createHarness();

  try {
    const unsafeNames = [
      "identity.pdf",
      "student-document.pdf",
      "11111111-1111-1111-1111-111111111111.pdf",
      "11111111-1111-4111-8111-111111111111.exe",
    ];

    for (const fileName of unsafeNames) {
      await assert.rejects(
        context.service.getSafeDocumentPath(
          instituteA,
          fileName
        ),
        /TENANT_FILE_NAME_INVALID/
      );
    }
  } finally {
    await context.cleanup();
  }
});

test("resolves files only from the current institute directory", async () => {
  const context = await createHarness();

  try {
    const fileA = await context.createPhysicalDocument(
      instituteA
    );

    const resultA =
      await context.service.getExistingDocumentFile(
        instituteA,
        validFileName
      );

    const resultB =
      await context.service.getExistingDocumentFile(
        instituteB,
        validFileName
      );

    assert.equal(resultA.path, fileA);
    assert.equal(resultB, null);
  } finally {
    await context.cleanup();
  }
});

test("ignores an untrusted stored filePath and resolves by server-generated filename", async () => {
  const context = await createHarness();

  try {
    const filePath = await context.createPhysicalDocument();

    const student = context.getStudent(
      instituteA,
      studentAId
    );

    student.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: validFileName,
        filePath: path.resolve(
          context.rootDir,
          "..",
          "outside-private-file.pdf"
        ),
        mimeType: "application/pdf",
        fileSize: 21,
      },
    ];

    const result =
      await context.service.getStudentDocument(
        context.createRequest(),
        studentAId,
        documentId
      );

    assert.ok(result);
    assert.equal(result.file.path, filePath);
    assert.notEqual(
      result.file.path,
      student.uploadDocument[0].filePath
    );
  } finally {
    await context.cleanup();
  }
});

test("does not expose Institute A document metadata to Institute B", async () => {
  const context = await createHarness();

  try {
    const studentA = context.getStudent(
      instituteA,
      studentAId
    );

    studentA.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: validFileName,
        mimeType: "application/pdf",
        fileSize: 100,
      },
    ];

    const result =
      await context.service.listStudentDocuments(
        context.createRequest({
          institute: instituteB,
        }),
        studentAId
      );

    assert.equal(result, null);
  } finally {
    await context.cleanup();
  }
});

test("does not retrieve another institute document using a matching document ID", async () => {
  const context = await createHarness();

  try {
    await context.createPhysicalDocument(instituteA);

    const studentB = context.getStudent(
      instituteB,
      studentBId
    );

    studentB.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: validFileName,
        mimeType: "application/pdf",
        fileSize: 100,
      },
    ];

    const result =
      await context.service.getStudentDocument(
        context.createRequest({
          institute: instituteB,
        }),
        studentBId,
        documentId
      );

    assert.ok(result);
    assert.equal(result.file, null);
  } finally {
    await context.cleanup();
  }
});

test("student cannot use a supplied student ID to access another student", async () => {
  const context = await createHarness();

  try {
    await assert.rejects(
      context.service.listStudentDocuments(
        context.createRequest({
          role: "student",
          studentRecord: studentAId,
        }),
        studentBId
      ),
      /TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN/
    );
  } finally {
    await context.cleanup();
  }
});

test("does not save metadata when the physical file is missing", async () => {
  const context = await createHarness();

  try {
    const student = context.getStudent(
      instituteA,
      studentAId
    );

    await assert.rejects(
      context.service.appendStudentDocuments(
        context.createRequest(),
        studentAId,
        [
          {
            originalName: "Identity.pdf",
            fileName: validFileName,
            mimeType: "application/pdf",
            fileSize: 100,
          },
        ]
      ),
      /TENANT_DOCUMENT_FILE_MISSING/
    );

    assert.equal(student.uploadDocument.length, 0);
  } finally {
    await context.cleanup();
  }
});

test("rejects a filename whose extension does not match the declared MIME type", async () => {
  const context = await createHarness();

  try {
    const fileName =
      "11111111-1111-4111-8111-111111111111.jpg";

    await context.createPhysicalDocument(
      instituteA,
      fileName
    );

    const student = context.getStudent(
      instituteA,
      studentAId
    );

    await assert.rejects(
      context.service.appendStudentDocuments(
        context.createRequest(),
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
      /TENANT_DOCUMENT_METADATA_INVALID/
    );

    assert.equal(student.uploadDocument.length, 0);
  } finally {
    await context.cleanup();
  }
});

test("deleting a document removes only the current institute's physical file", async () => {
  const context = await createHarness();

  try {
    const fileA = await context.createPhysicalDocument(
      instituteA
    );

    const fileB = await context.createPhysicalDocument(
      instituteB
    );

    const studentA = context.getStudent(
      instituteA,
      studentAId
    );

    studentA.uploadDocument = [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: validFileName,
        mimeType: "application/pdf",
        fileSize: 21,
      },
    ];

    const result =
      await context.service.deleteStudentDocument(
        context.createRequest(),
        studentAId,
        documentId
      );

    assert.equal(result.documentId, documentId);
    assert.equal(studentA.uploadDocument.length, 0);

    await assert.rejects(
      fs.access(fileA),
      { code: "ENOENT" }
    );

    await fs.access(fileB);
  } finally {
    await context.cleanup();
  }
});
