
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantStudentDocumentController,
} from "../controllers/tenantStudentDocument.controller.js";

const studentId = "111111111111111111111111";
const documentId = "222222222222222222222222";

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    headers: {},
    sentFile: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },

    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },

    sendFile(filePath) {
      this.sentFile = filePath;
      return this;
    },
  };

  return response;
};

const createRequest = (overrides = {}) => ({
  params: {
    studentId,
    documentId,
  },
  body: {},
  files: [],
  tenantUser: {
    role: "admin",
  },
  ...overrides,
});

const createService = (overrides = {}) => ({
  async listStudentDocuments() {
    return {
      student: {
        _id: studentId,
        name: "Test Student",
        rollNo: "EMS001",
      },
      documents: [],
    };
  },

  async getStudentDocument() {
    return {
      student: { _id: studentId },
      document: {
        _id: documentId,
        originalName: "Identity.pdf",
        mimeType: "application/pdf",
      },
      file: {
        path: "/private/tenant/students/documents/test.pdf",
      },
    };
  },

  async appendStudentDocuments() {
    return [
      {
        _id: documentId,
        originalName: "Identity.pdf",
        fileName: "11111111-1111-4111-8111-111111111111.pdf",
        mimeType: "application/pdf",
      },
    ];
  },

  async deleteStudentDocument() {
    return { documentId };
  },

  ...overrides,
});

const createController = (service = createService()) =>
  createTenantStudentDocumentController({ service });

const createNext = () => {
  const calls = [];

  const next = (error) => {
    calls.push(error || null);
  };

  next.calls = calls;
  return next;
};

const createTemporaryFile = async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-tenant-document-controller-")
  );

  const filePath = path.join(directory, "uploaded.pdf");

  await fs.writeFile(filePath, "test file");

  return {
    directory,
    filePath,
    file: {
      path: filePath,
      filename: "11111111-1111-4111-8111-111111111111.pdf",
      originalname: "identity.pdf",
      mimetype: "application/pdf",
      size: 9,
    },
    cleanup: () =>
      fs.rm(directory, {
        recursive: true,
        force: true,
      }),
  };
};

test("rejects an invalid controller service configuration", () => {
  assert.throws(
    () => createTenantStudentDocumentController({
      service: {},
    }),
    /TENANT_DOCUMENT_CONTROLLER_CONFIG_INVALID/
  );
});

test("lists documents for the requested admin student", async () => {
  let receivedStudentId;

  const controller = createController(
    createService({
      async listStudentDocuments(req, requestedId) {
        receivedStudentId = requestedId;

        return {
          student: { _id: studentId },
          documents: [],
        };
      },
    })
  );

  const req = createRequest();
  const res = createResponse();
  const next = createNext();

  await controller.getDocuments(req, res, next);

  assert.equal(receivedStudentId, studentId);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(next.calls, []);
});

test("student document listing ignores a browser-supplied student ID", async () => {
  let receivedStudentId = "not-called";

  const controller = createController(
    createService({
      async listStudentDocuments(req, requestedId) {
        receivedStudentId = requestedId;

        return {
          student: { _id: studentId },
          documents: [],
        };
      },
    })
  );

  const req = createRequest({
    tenantUser: {
      role: "student",
      studentRecord: studentId,
    },
    params: {
      studentId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });

  const res = createResponse();

  await controller.getDocuments(req, res, createNext());

  assert.equal(receivedStudentId, undefined);
  assert.equal(res.statusCode, 200);
});

test("returns 404 when the requested student does not exist", async () => {
  const controller = createController(
    createService({
      async listStudentDocuments() {
        return null;
      },
    })
  );

  const res = createResponse();

  await controller.getDocuments(
    createRequest(),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "TENANT_STUDENT_NOT_FOUND");
});

test("uploads documents with custom display names and original extensions", async () => {
  const uploaded = await createTemporaryFile();

  try {
    let receivedStudentId;
    let receivedDocuments;

    const controller = createController(
      createService({
        async appendStudentDocuments(req, requestedId, documents) {
          receivedStudentId = requestedId;
          receivedDocuments = documents;

          return documents;
        },
      })
    );

    const req = createRequest({
      files: [uploaded.file],
      body: {
        documentNames: JSON.stringify(["Identity Proof"]),
      },
    });

    const res = createResponse();
    const next = createNext();

    await controller.uploadDocuments(req, res, next);

    assert.equal(receivedStudentId, studentId);
    assert.equal(receivedDocuments.length, 1);
    assert.equal(receivedDocuments[0].originalName, "Identity Proof.pdf");
    assert.equal(receivedDocuments[0].fileName, uploaded.file.filename);
    assert.equal(receivedDocuments[0].mimeType, "application/pdf");
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.deepEqual(next.calls, []);

    // Successful uploads must remain on disk.
    await fs.access(uploaded.filePath);
  } finally {
    await uploaded.cleanup();
  }
});

test("rejects invalid JSON in documentNames and cleans uploaded files", async () => {
  const uploaded = await createTemporaryFile();

  try {
    const controller = createController();
    const req = createRequest({
      files: [uploaded.file],
      body: {
        documentNames: "{invalid",
      },
    });

    const res = createResponse();

    await controller.uploadDocuments(req, res, createNext());

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "TENANT_DOCUMENT_NAMES_INVALID");

    await assert.rejects(
      fs.access(uploaded.filePath),
      { code: "ENOENT" }
    );
  } finally {
    await uploaded.cleanup();
  }
});

test("rejects a missing custom name and cleans uploaded files", async () => {
  const uploaded = await createTemporaryFile();

  try {
    const controller = createController();
    const req = createRequest({
      files: [uploaded.file],
      body: {
        documentNames: JSON.stringify([]),
      },
    });

    const res = createResponse();

    await controller.uploadDocuments(req, res, createNext());

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "TENANT_DOCUMENT_NAMES_REQUIRED");

    await assert.rejects(
      fs.access(uploaded.filePath),
      { code: "ENOENT" }
    );
  } finally {
    await uploaded.cleanup();
  }
});

test("rejects empty and oversized custom names and cleans uploaded files", async (t) => {
  const cases = [
    {
      name: "empty name",
      value: [""],
      expectedCode: "TENANT_DOCUMENT_NAME_EMPTY",
    },
    {
      name: "name longer than 120 characters",
      value: ["A".repeat(121)],
      expectedCode: "TENANT_DOCUMENT_NAME_TOO_LONG",
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const uploaded = await createTemporaryFile();

      try {
        const controller = createController();

        const req = createRequest({
          files: [uploaded.file],
          body: {
            documentNames: JSON.stringify(item.value),
          },
        });

        const res = createResponse();

        await controller.uploadDocuments(
          req,
          res,
          createNext()
        );

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.code, item.expectedCode);

        await assert.rejects(
          fs.access(uploaded.filePath),
          { code: "ENOENT" }
        );
      } finally {
        await uploaded.cleanup();
      }
    });
  }
});

test("cleans uploaded files when tenant metadata persistence fails", async () => {
  const uploaded = await createTemporaryFile();

  try {
    const controller = createController(
      createService({
        async appendStudentDocuments() {
          throw new Error("TENANT_DOCUMENT_FILE_MISSING");
        },
      })
    );

    const req = createRequest({
      files: [uploaded.file],
      body: {
        documentNames: JSON.stringify(["Identity"]),
      },
    });

    const res = createResponse();

    await controller.uploadDocuments(req, res, createNext());

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "TENANT_DOCUMENT_FILE_MISSING");

    await assert.rejects(
      fs.access(uploaded.filePath),
      { code: "ENOENT" }
    );
  } finally {
    await uploaded.cleanup();
  }
});

test("passes unexpected upload errors to Express error handling", async () => {
  const uploaded = await createTemporaryFile();

  try {
    const expectedError = new Error("DATABASE_FAILURE");

    const controller = createController(
      createService({
        async appendStudentDocuments() {
          throw expectedError;
        },
      })
    );

    const req = createRequest({
      files: [uploaded.file],
      body: {
        documentNames: JSON.stringify(["Identity"]),
      },
    });

    const res = createResponse();
    const next = createNext();

    await controller.uploadDocuments(req, res, next);

    assert.equal(next.calls.length, 1);
    assert.equal(next.calls[0], expectedError);

    await assert.rejects(
      fs.access(uploaded.filePath),
      { code: "ENOENT" }
    );
  } finally {
    await uploaded.cleanup();
  }
});

test("serves a document with private inline response headers", async () => {
  const controller = createController();
  const req = createRequest();
  const res = createResponse();

  await controller.viewDocument(req, res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(
    res.headers["Content-Type"],
    "application/pdf"
  );
  assert.match(
    res.headers["Content-Disposition"],
    /^inline;/
  );
  assert.equal(
    res.headers["Cache-Control"],
    "private, no-store"
  );
  assert.equal(
    res.headers["X-Content-Type-Options"],
    "nosniff"
  );
  assert.equal(
    res.sentFile,
    "/private/tenant/students/documents/test.pdf"
  );
});

test("serves a document with attachment disposition for download", async () => {
  const controller = createController();
  const req = createRequest();
  const res = createResponse();

  await controller.downloadDocument(req, res, createNext());

  assert.match(
    res.headers["Content-Disposition"],
    /^attachment;/
  );
  assert.ok(res.sentFile);
});

test("returns 404 when the physical document file is missing", async () => {
  const controller = createController(
    createService({
      async getStudentDocument() {
        return {
          student: { _id: studentId },
          document: {
            _id: documentId,
            originalName: "Identity.pdf",
          },
          file: null,
        };
      },
    })
  );

  const res = createResponse();

  await controller.viewDocument(
    createRequest(),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "TENANT_DOCUMENT_FILE_MISSING");
});

test("deletes a tenant student document successfully", async () => {
  let receivedStudentId;
  let receivedDocumentId;

  const controller = createController(
    createService({
      async deleteStudentDocument(req, requestedId, requestedDocumentId) {
        receivedStudentId = requestedId;
        receivedDocumentId = requestedDocumentId;

        return {
          documentId: requestedDocumentId,
        };
      },
    })
  );

  const res = createResponse();

  await controller.deleteDocument(
    createRequest(),
    res,
    createNext()
  );

  assert.equal(receivedStudentId, studentId);
  assert.equal(receivedDocumentId, documentId);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("maps tenant ownership errors to forbidden responses", async () => {
  const controller = createController(
    createService({
      async listStudentDocuments() {
        throw new Error("TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN");
      },
    })
  );

  const res = createResponse();

  await controller.getDocuments(
    createRequest({
      tenantUser: {
        role: "student",
        studentRecord: studentId,
      },
    }),
    res,
    createNext()
  );

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.code,
    "TENANT_DOCUMENT_OWNERSHIP_FORBIDDEN"
  );
});
