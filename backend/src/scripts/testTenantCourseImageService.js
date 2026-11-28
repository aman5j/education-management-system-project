
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantCourseImageService,
} from "../services/tenantCourseImage.service.js";

const A = {
  instituteId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  collectionPrefix: "inst_aaaaaaaaaaaaaaaaaaaaaaaa",
};

const B = {
  instituteId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  collectionPrefix: "inst_bbbbbbbbbbbbbbbbbbbbbbbb",
};

const createFixture = async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "tenant-course-image-")
  );

  const service = createTenantCourseImageService({
    storage: {
      rootDir: root,
      getTenantDirectory(context) {
        const id = String(context?.instituteId || "").toLowerCase();
        const prefix = String(context?.collectionPrefix || "");

        if (
          !/^[a-f0-9]{24}$/.test(id) ||
          prefix !== `inst_${id}`
        ) {
          throw new Error("TENANT_FILE_CONTEXT_INVALID");
        }

        return path.join(root, prefix);
      },
    },
  });

  return {
    root,
    service,
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
};

const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
]);

test("saves and reads a private tenant Course image", async () => {
  const fixture = await createFixture();

  try {
    const saved = await fixture.service.saveImage(
      A,
      png,
      "image/png"
    );

    assert.match(saved.fileName, /^[a-f0-9-]+\.png$/i);

    const image = await fixture.service.readImage(
      A,
      saved.fileName
    );

    assert.ok(image);
    assert.equal(image.mimeType, "image/png");
    assert.equal(image.size, png.length);
  } finally {
    await fixture.cleanup();
  }
});

test("isolates Course images between institutes", async () => {
  const fixture = await createFixture();

  try {
    const saved = await fixture.service.saveImage(
      A,
      png,
      "image/png"
    );

    const image = await fixture.service.readImage(
      B,
      saved.fileName
    );

    assert.equal(image, null);
  } finally {
    await fixture.cleanup();
  }
});

test("rejects invalid institute storage context", async () => {
  const fixture = await createFixture();

  try {
    await assert.rejects(
      fixture.service.getCourseImageDirectory({
        instituteId: A.instituteId,
        collectionPrefix: B.collectionPrefix,
      }),
      /TENANT_FILE_CONTEXT_INVALID/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("rejects path traversal filenames", async () => {
  const fixture = await createFixture();

  try {
    await assert.rejects(
      fixture.service.getSafeImagePath(A, "../secret.png"),
      /TENANT_COURSE_IMAGE_NAME_INVALID/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("rejects unsupported image MIME types", async () => {
  const fixture = await createFixture();

  try {
    await assert.rejects(
      fixture.service.saveImage(A, png, "application/pdf"),
      /TENANT_COURSE_IMAGE_TYPE_INVALID/
    );
  } finally {
    await fixture.cleanup();
  }
});

test("deletes only the requested institute's managed image", async () => {
  const fixture = await createFixture();

  try {
    const saved = await fixture.service.saveImage(
      A,
      png,
      "image/png"
    );

    await fixture.service.deleteImage(A, saved.fileName);

    assert.equal(
      await fixture.service.readImage(A, saved.fileName),
      null
    );
  } finally {
    await fixture.cleanup();
  }
});

test("rejects symbolic-link image files", async () => {
  const fixture = await createFixture();

  try {
    const directory =
      await fixture.service.getCourseImageDirectory(A);

    const externalFile = path.join(fixture.root, "outside.png");
    await fs.writeFile(externalFile, png);

    const fileName = "123e4567-e89b-42d3-a456-426614174000.png";
    const linkPath = path.join(directory, fileName);

    await fs.symlink(externalFile, linkPath);

    await assert.rejects(
      fixture.service.readImage(A, fileName),
      /TENANT_COURSE_IMAGE_PATH_INVALID/
    );
  } finally {
    await fixture.cleanup();
  }
});
