
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createTenantFileStorage,
} from "../services/tenantFileStorage.js";

import {
  createTenantCategoryIconService,
} from "../services/tenantCategoryIcon.service.js";

const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "ems-category-icons-")
);

const storage = createTenantFileStorage({
  rootDir: path.join(temporaryRoot, "tenants"),
});

const service = createTenantCategoryIconService({
  storage,
});

const instituteA = {
  instituteId: "6b098f3ecfef527d1a4a93b2",
  collectionPrefix: "inst_6b098f3ecfef527d1a4a93b2",
};

const instituteB = {
  instituteId: "6b098f3ecfef527d1a4a93b3",
  collectionPrefix: "inst_6b098f3ecfef527d1a4a93b3",
};

after(async () => {
  await fs.rm(temporaryRoot, {
    recursive: true,
    force: true,
  });
});

test("creates separate category icon directories for two institutes", async () => {
  const directoryA =
    await service.getIconsDirectory(instituteA);

  const directoryB =
    await service.getIconsDirectory(instituteB);

  assert.notEqual(directoryA, directoryB);

  assert.ok(
    directoryA.includes(instituteA.collectionPrefix)
  );

  assert.ok(
    directoryB.includes(instituteB.collectionPrefix)
  );
});

test("stores and reads an icon inside its own institute directory", async () => {
  const imageA = Buffer.from("institute-a-image");

  const saved = await service.saveIcon(
    instituteA,
    imageA,
    "image/png"
  );

  assert.match(
    saved.fileName,
    /^[0-9a-f-]+\.png$/i
  );

  const result = await service.readIcon(
    instituteA,
    saved.fileName
  );

  assert.ok(result);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.size, imageA.length);

  const storedBuffer = await fs.readFile(result.path);

  assert.deepEqual(storedBuffer, imageA);
});

test("another institute cannot read the first institute's icon", async () => {
  const saved = await service.saveIcon(
    instituteA,
    Buffer.from("private-image"),
    "image/jpeg"
  );

  const result = await service.readIcon(
    instituteB,
    saved.fileName
  );

  assert.equal(result, null);
});

test("another institute cannot delete the first institute's icon", async () => {
  const saved = await service.saveIcon(
    instituteA,
    Buffer.from("private-image"),
    "image/png"
  );

  await service.deleteIcon(
    instituteB,
    saved.fileName
  );

  const result = await service.readIcon(
    instituteA,
    saved.fileName
  );

  assert.ok(result);
});

test("rejects an invalid tenant context", async () => {
  await assert.rejects(
    service.getIconsDirectory({
      instituteId: "not-an-object-id",
      collectionPrefix: "inst_not-an-object-id",
    }),
    /TENANT_FILE_CONTEXT_INVALID/
  );
});

test("rejects a mismatched tenant collection prefix", async () => {
  await assert.rejects(
    service.getIconsDirectory({
      instituteId: instituteA.instituteId,
      collectionPrefix: instituteB.collectionPrefix,
    }),
    /TENANT_FILE_PREFIX_INVALID/
  );
});

test("rejects path traversal and non-generated file names", async () => {
  await assert.rejects(
    service.getSafeIconPath(
      instituteA,
      "../../secret.png"
    ),
    /TENANT_CATEGORY_ICON_NAME_INVALID/
  );

  await assert.rejects(
    service.getSafeIconPath(
      instituteA,
      "my-category.png"
    ),
    /TENANT_CATEGORY_ICON_NAME_INVALID/
  );
});

test("rejects unsupported MIME types and empty buffers", async () => {
  await assert.rejects(
    service.saveIcon(
      instituteA,
      Buffer.from("image"),
      "image/gif"
    ),
    /TENANT_CATEGORY_ICON_TYPE_INVALID/
  );

  await assert.rejects(
    service.saveIcon(
      instituteA,
      Buffer.alloc(0),
      "image/png"
    ),
    /TENANT_CATEGORY_ICON_INVALID/
  );
});

test("deleting an icon removes only the selected tenant file", async () => {
  const savedA = await service.saveIcon(
    instituteA,
    Buffer.from("image-a"),
    "image/png"
  );

  const savedB = await service.saveIcon(
    instituteB,
    Buffer.from("image-b"),
    "image/png"
  );

  await service.deleteIcon(
    instituteA,
    savedA.fileName
  );

  assert.equal(
    await service.readIcon(
      instituteA,
      savedA.fileName
    ),
    null
  );

  assert.ok(
    await service.readIcon(
      instituteB,
      savedB.fileName
    )
  );
});
