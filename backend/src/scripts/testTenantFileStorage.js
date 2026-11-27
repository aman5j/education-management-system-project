
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantFileStorage,
  getTrustedTenantFileContext,
} from "../services/tenantFileStorage.js";

const instituteA = {
  instituteId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  collectionPrefix:
    "inst_aaaaaaaaaaaaaaaaaaaaaaaa",
};

const instituteB = {
  instituteId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  collectionPrefix:
    "inst_bbbbbbbbbbbbbbbbbbbbbbbb",
};

const createTestStorage = async () => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-tenant-files-")
  );

  return {
    rootDir,
    storage: createTenantFileStorage({ rootDir }),
    cleanup: () => fs.rm(rootDir, {
      recursive: true,
      force: true,
    }),
  };
};

test("validates trusted institute context", () => {
  const result =
    getTrustedTenantFileContext(instituteA);

  assert.equal(
    result.instituteId,
    instituteA.instituteId
  );

  assert.equal(
    result.collectionPrefix,
    instituteA.collectionPrefix
  );
});

test("rejects a missing institute ID", () => {
  assert.throws(
    () =>
      getTrustedTenantFileContext({
        collectionPrefix: instituteA.collectionPrefix,
      }),
    /TENANT_FILE_CONTEXT_INVALID/
  );
});

test("rejects an invalid institute ID", () => {
  assert.throws(
    () =>
      getTrustedTenantFileContext({
        instituteId: "../../outside",
        collectionPrefix: "inst_outside",
      }),
    /TENANT_FILE_CONTEXT_INVALID/
  );
});

test("rejects a collection prefix that does not match institute ID", () => {
  assert.throws(
    () =>
      getTrustedTenantFileContext({
        instituteId: instituteA.instituteId,
        collectionPrefix: instituteB.collectionPrefix,
      }),
    /TENANT_FILE_PREFIX_INVALID/
  );
});

test("creates separate directories for different institutes", async () => {
  const context = await createTestStorage();

  try {
    const directoryA =
      await context.storage.ensureTenantDirectory(
        instituteA
      );

    const directoryB =
      await context.storage.ensureTenantDirectory(
        instituteB
      );

    assert.notEqual(directoryA, directoryB);

    assert.equal(
      path.dirname(directoryA),
      context.rootDir
    );

    assert.equal(
      path.dirname(directoryB),
      context.rootDir
    );

    assert.equal(
      path.basename(directoryA),
      instituteA.collectionPrefix
    );

    assert.equal(
      path.basename(directoryB),
      instituteB.collectionPrefix
    );
  } finally {
    await context.cleanup();
  }
});

test("generates random server-controlled filenames", async () => {
  const context = await createTestStorage();

  try {
    const first =
      context.storage.createFileName("application/pdf");

    const second =
      context.storage.createFileName("application/pdf");

    assert.match(
      first,
      /^[0-9a-f-]{36}\.pdf$/i
    );

    assert.notEqual(first, second);
  } finally {
    await context.cleanup();
  }
});

test("rejects unsupported MIME types", async () => {
  const context = await createTestStorage();

  try {
    assert.throws(
      () =>
        context.storage.createFileName(
          "application/javascript"
        ),
      /TENANT_FILE_TYPE_NOT_ALLOWED/
    );
  } finally {
    await context.cleanup();
  }
});

test("resolves a safe file path inside the correct institute directory", async () => {
  const context = await createTestStorage();

  try {
    const fileName =
      context.storage.createFileName("application/pdf");

    const filePath =
      context.storage.getSafeFilePath(
        instituteA,
        fileName
      );

    assert.equal(
      path.dirname(filePath),
      path.join(
        context.rootDir,
        instituteA.collectionPrefix
      )
    );
  } finally {
    await context.cleanup();
  }
});

test("rejects path traversal and arbitrary filenames", async () => {
  const context = await createTestStorage();

  try {
    assert.throws(
      () =>
        context.storage.getSafeFilePath(
          instituteA,
          "../../outside.pdf"
        ),
      /TENANT_FILE_NAME_INVALID/
    );

    assert.throws(
      () =>
        context.storage.getSafeFilePath(
          instituteA,
          "outside.pdf"
        ),
      /TENANT_FILE_NAME_INVALID/
    );
  } finally {
    await context.cleanup();
  }
});

test("prevents Institute B from resolving Institute A's directory", async () => {
  const context = await createTestStorage();

  try {
    const fileName =
      context.storage.createFileName("application/pdf");

    const pathA =
      context.storage.getSafeFilePath(
        instituteA,
        fileName
      );

    const pathB =
      context.storage.getSafeFilePath(
        instituteB,
        fileName
      );

    assert.notEqual(pathA, pathB);

    assert.equal(
      path.dirname(pathA),
      path.join(
        context.rootDir,
        instituteA.collectionPrefix
      )
    );

    assert.equal(
      path.dirname(pathB),
      path.join(
        context.rootDir,
        instituteB.collectionPrefix
      )
    );
  } finally {
    await context.cleanup();
  }
});

test("returns null when a tenant file does not exist", async () => {
  const context = await createTestStorage();

  try {
    const fileName =
      context.storage.createFileName("application/pdf");

    const result =
      await context.storage.getExistingFile(
        instituteA,
        fileName
      );

    assert.equal(result, null);
  } finally {
    await context.cleanup();
  }
});

test("retrieves and deletes a file only within its institute directory", async () => {
  const context = await createTestStorage();

  try {
    const directory =
      await context.storage.ensureTenantDirectory(
        instituteA
      );

    const fileName =
      context.storage.createFileName("application/pdf");

    const filePath =
      context.storage.getSafeFilePath(
        instituteA,
        fileName
      );

    await fs.writeFile(filePath, "test document");

    const result =
      await context.storage.getExistingFile(
        instituteA,
        fileName
      );

    assert.ok(result);
    assert.equal(result.size, 13);

    const otherInstituteResult =
      await context.storage.getExistingFile(
        instituteB,
        fileName
      );

    assert.equal(otherInstituteResult, null);

    await context.storage.deleteFile(
      instituteA,
      fileName
    );

    const afterDelete =
      await context.storage.getExistingFile(
        instituteA,
        fileName
      );

    assert.equal(afterDelete, null);

    // The file should be deleted, but the institute directory
    // should remain available for future uploads.
    await assert.rejects(
    fs.access(filePath),
    { code: "ENOENT" }
    );

    await assert.doesNotReject(
    fs.access(directory)
    );
  } finally {
    await context.cleanup();
  }
});
