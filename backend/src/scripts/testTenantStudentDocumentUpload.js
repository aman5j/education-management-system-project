
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { after, test } from "node:test";
import express from "express";

import { createTenantFileStorage } from "../services/tenantFileStorage.js";
import {
  createTenantStudentDocumentService,
} from "../services/tenantStudentDocument.service.js";
import {
  createTenantStudentDocumentUpload,
} from "../middleware/tenantStudentDocumentUpload.middleware.js";

const INSTITUTE_A = {
  instituteId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  collectionPrefix: "inst_aaaaaaaaaaaaaaaaaaaaaaaa",
};

const INSTITUTE_B = {
  instituteId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  collectionPrefix: "inst_bbbbbbbbbbbbbbbbbbbbbbbb",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const PDF_BUFFER = Buffer.from("%PDF-1.7\nTenant test PDF");
const JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
]);
const PNG_BUFFER = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
]);
const OFFICE_BUFFER = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const DOCX_BUFFER = Buffer.from(
  "PK\u0003\u0004word/document.xml"
);
const XLSX_BUFFER = Buffer.from(
  "PK\u0003\u0004xl/workbook.xml"
);

const temporaryDirectories = new Set();
const activeServers = new Set();

after(async () => {
  await Promise.all(
    [...activeServers].map(
      (server) =>
        new Promise((resolve) => server.close(resolve))
    )
  );

  await Promise.all(
    [...temporaryDirectories].map((directory) =>
      fs.rm(directory, {
        recursive: true,
        force: true,
      })
    )
  );
});

const createFixture = async ({
  tenantContext = INSTITUTE_A,
  role = "admin",
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = 10,
} = {}) => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "tenant-document-upload-")
  );

  temporaryDirectories.add(rootDir);

  const storage = createTenantFileStorage({
    rootDir,
  });

  const documentService =
    createTenantStudentDocumentService({
      storage,
    });

  const uploadMiddleware =
    createTenantStudentDocumentUpload({
      storage,
      documentService,
      maxFileSize,
      maxFiles,
    });

  const app = express();

  app.post(
    "/upload",
    (req, res, next) => {
      req.tenantContext = tenantContext;
      req.tenantUser = role ? { role } : null;
      next();
    },
    uploadMiddleware,
    (req, res) => {
      res.status(200).json({
        success: true,
        files: (req.files || []).map((file) => ({
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        })),
      });
    }
  );

  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  activeServers.add(server);

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/upload`;

  return {
    rootDir,
    storage,
    documentService,
    server,
    url,
    tenantContext,
  };
};

const makeForm = (files) => {
  const form = new FormData();

  for (const file of files) {
    form.append(
      "documents",
      new Blob([file.buffer], {
        type: file.mime,
      }),
      file.name || "document"
    );
  }

  return form;
};

const upload = async (fixture, files) => {
  const response = await fetch(fixture.url, {
    method: "POST",
    body: makeForm(files),
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
};

const getDocumentsDirectory = (fixture) =>
  fixture.documentService.getDocumentsDirectory(
    fixture.tenantContext
  );

const getStoredFiles = async (fixture) => {
  const directory = await getDocumentsDirectory(fixture);

  return fs.readdir(directory).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
};

const file = (buffer, mime, name = "document") => ({
  buffer,
  mime,
  name,
});

test("uploads a valid PDF document", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(PDF_BUFFER, MIME.pdf, "sample.pdf"),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.files.length, 1);
  assert.equal(result.body.files[0].mimetype, MIME.pdf);
  assert.ok(result.body.files[0].filename.endsWith(".pdf"));

  const storedFiles = await getStoredFiles(fixture);
  assert.equal(storedFiles.length, 1);
});

test("uploads a valid JPEG image", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(JPEG_BUFFER, MIME.jpeg, "photo.jpg"),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.files.length, 1);
  assert.ok(result.body.files[0].filename.endsWith(".jpg"));
});

test("uploads a valid PNG image", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(PNG_BUFFER, MIME.png, "photo.png"),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.files.length, 1);
  assert.ok(result.body.files[0].filename.endsWith(".png"));
});

test("accepts valid DOC and XLS file signatures", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(OFFICE_BUFFER, MIME.doc, "sample.doc"),
    file(OFFICE_BUFFER, MIME.xls, "sample.xls"),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.files.length, 2);

  assert.ok(
    result.body.files.some((item) =>
      item.filename.endsWith(".doc")
    )
  );

  assert.ok(
    result.body.files.some((item) =>
      item.filename.endsWith(".xls")
    )
  );
});

test("accepts DOCX and XLSX package markers", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(DOCX_BUFFER, MIME.docx, "sample.docx"),
    file(XLSX_BUFFER, MIME.xlsx, "sample.xlsx"),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.files.length, 2);

  assert.ok(
    result.body.files.some((item) =>
      item.filename.endsWith(".docx")
    )
  );

  assert.ok(
    result.body.files.some((item) =>
      item.filename.endsWith(".xlsx")
    )
  );
});

test("rejects an unsupported MIME type", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(
      Buffer.from("plain text"),
      "text/plain",
      "sample.txt"
    ),
  ]);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.code,
    "TENANT_FILE_TYPE_NOT_ALLOWED"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});

test("rejects MIME and file-content mismatch and cleans up files", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(PDF_BUFFER, MIME.jpeg, "fake-image.jpg"),
  ]);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.code,
    "TENANT_FILE_CONTENT_INVALID"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});

test("rejects missing tenant context", async () => {
  const fixture = await createFixture({
    tenantContext: null,
  });

  const result = await upload(fixture, [
    file(PDF_BUFFER, MIME.pdf, "sample.pdf"),
  ]);

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_CONTEXT_UNAVAILABLE"
  );
});

test("rejects student role from document upload", async () => {
  const fixture = await createFixture({
    role: "student",
  });

  const result = await upload(fixture, [
    file(PDF_BUFFER, MIME.pdf, "sample.pdf"),
  ]);

  assert.equal(result.status, 403);
  assert.equal(
    result.body.code,
    "TENANT_DOCUMENT_UPLOAD_FORBIDDEN"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});

test("rejects more than ten uploaded files and cleans up", async () => {
  const fixture = await createFixture();

  const files = Array.from({ length: 11 }, (_, index) =>
    file(
      PDF_BUFFER,
      MIME.pdf,
      `document-${index + 1}.pdf`
    )
  );

  const result = await upload(fixture, files);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.code,
    "TENANT_FILE_COUNT_EXCEEDED"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});

test("rejects a file larger than 10 MB and cleans up", async () => {
  const fixture = await createFixture();

  const largeBuffer = Buffer.alloc(
    MAX_FILE_SIZE + 1,
    0x41
  );

  const result = await upload(fixture, [
    file(largeBuffer, MIME.pdf, "large.pdf"),
  ]);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.code,
    "TENANT_FILE_TOO_LARGE"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});

test("Institute A and Institute B use different document directories", async () => {
  const fixtureA = await createFixture({
    tenantContext: INSTITUTE_A,
  });

  const fixtureB = await createFixture({
    tenantContext: INSTITUTE_B,
  });

  const resultA = await upload(fixtureA, [
    file(PDF_BUFFER, MIME.pdf, "a.pdf"),
  ]);

  const resultB = await upload(fixtureB, [
    file(PDF_BUFFER, MIME.pdf, "b.pdf"),
  ]);

  assert.equal(resultA.status, 200);
  assert.equal(resultB.status, 200);

  const directoryA = await getDocumentsDirectory(fixtureA);
  const directoryB = await getDocumentsDirectory(fixtureB);

  assert.notEqual(directoryA, directoryB);
  assert.ok(directoryA.includes(INSTITUTE_A.collectionPrefix));
  assert.ok(directoryB.includes(INSTITUTE_B.collectionPrefix));

  assert.equal((await fs.readdir(directoryA)).length, 1);
  assert.equal((await fs.readdir(directoryB)).length, 1);
});

test("cleans up all uploaded files when one file has invalid content", async () => {
  const fixture = await createFixture();

  const result = await upload(fixture, [
    file(PDF_BUFFER, MIME.pdf, "valid.pdf"),
    file(Buffer.from("not a real PDF"), MIME.pdf, "invalid.pdf"),
  ]);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.code,
    "TENANT_FILE_CONTENT_INVALID"
  );

  assert.deepEqual(await getStoredFiles(fixture), []);
});
