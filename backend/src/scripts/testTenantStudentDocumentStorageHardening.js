
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

const validFileName =
  "11111111-1111-4111-8111-111111111111.pdf";

const createHarness = async () => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-storage-hardening-")
  );

  const outsideDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ems-storage-outside-")
  );

  const storage = createTenantFileStorage({ rootDir });

  const service = createTenantStudentDocumentService({
    storage,
  });

  return {
    rootDir,
    outsideDir,
    storage,
    service,

    cleanup: async () => {
      await Promise.all([
        fs.rm(rootDir, {
          recursive: true,
          force: true,
        }),
        fs.rm(outsideDir, {
          recursive: true,
          force: true,
        }),
      ]);
    },
  };
};

const createDirectorySymlink = async (
  target,
  linkPath,
  t
) => {
  try {
    await fs.symlink(
      target,
      linkPath,
      process.platform === "win32" ? "junction" : "dir"
    );

    return true;
  } catch (error) {
    if (
      ["EPERM", "EACCES", "ENOTSUP", "EINVAL"].includes(
        error.code
      )
    ) {
      t.skip(
        `Directory symlink creation is unavailable: ${error.code}`
      );

      return false;
    }

    throw error;
  }
};

test(
  "rejects an institute directory redirected outside the configured storage root",
  async (t) => {
    const context = await createHarness();

    try {
      const tenantRoot = storageTenantDirectory(context);

      await createDirectorySymlink(
        context.outsideDir,
        tenantRoot,
        t
      );

      if (t.todo) {
        // No special handling required.
      }

      // If symlink creation was skipped, do not continue.
      const stat = await fs.lstat(tenantRoot).catch(() => null);

      if (!stat?.isSymbolicLink()) {
        t.skip("Tenant directory symlink was not created");
        return;
      }

      await assert.rejects(
        context.service.getDocumentsDirectory(instituteA),
        /TENANT_DOCUMENT_PATH_INVALID/
      );

      // Rejection must happen before creating directories outside
      // the configured tenant storage root.
      await assert.rejects(
        fs.access(path.join(context.outsideDir, "students")),
        { code: "ENOENT" }
      );
    } finally {
      await context.cleanup();
    }
  }
);

test(
  "rejects a students/documents directory redirected outside its institute directory",
  async (t) => {
    const context = await createHarness();

    try {
      const tenantRoot =
        await context.storage.ensureTenantDirectory(instituteA);

      const studentsDirectory = path.join(
        tenantRoot,
        "students"
      );

      const documentsDirectory = path.join(
        studentsDirectory,
        "documents"
      );

      await fs.mkdir(studentsDirectory, {
        recursive: true,
      });

      await fs.rm(documentsDirectory, {
        recursive: true,
        force: true,
      });

      await createDirectorySymlink(
        context.outsideDir,
        documentsDirectory,
        t
      );

      const stat = await fs.lstat(documentsDirectory).catch(
        () => null
      );

      if (!stat?.isSymbolicLink()) {
        t.skip("Documents directory symlink was not created");
        return;
      }

      await assert.rejects(
        context.service.getDocumentsDirectory(instituteA),
        /TENANT_DOCUMENT_PATH_INVALID/
      );
    } finally {
      await context.cleanup();
    }
  }
);

test(
  "does not read a document file redirected through a symbolic link",
  async (t) => {
    const context = await createHarness();

    try {
      const documentsDirectory =
        await context.service.getDocumentsDirectory(instituteA);

      const outsideFile = path.join(
        context.outsideDir,
        "outside-document.pdf"
      );

      const linkedFile = path.join(
        documentsDirectory,
        validFileName
      );

      await fs.writeFile(
        outsideFile,
        "private outside document"
      );

      await fs.symlink(outsideFile, linkedFile);

      const result =
        await context.service.getExistingDocumentFile(
          instituteA,
          validFileName
        );

      assert.equal(result, null);
    } finally {
      await context.cleanup();
    }
  }
);

function storageTenantDirectory(context) {
  return context.storage.getTenantDirectory(instituteA);
}
