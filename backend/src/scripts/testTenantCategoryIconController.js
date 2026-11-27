
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

import tenantCategoryIconService from "../services/tenantCategoryIcon.service.js";

import {
  uploadTenantCategoryIcon,
  getTenantCategoryIcon,
  deleteTenantCategoryIcon,
} from "../controllers/tenantCategoryIcon.controller.js";

const CATEGORY_ID = "6b098f3ecfef527d1a4a93b4";

const tenantContext = {
  instituteId: "6b098f3ecfef527d1a4a93b2",
  collectionPrefix: "inst_6b098f3ecfef527d1a4a93b2",
};

const createResponse = () => ({
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

  set(headers) {
    this.headers = headers;
    return this;
  },

  sendFile(filePath) {
    this.sentFile = filePath;
    return this;
  },
});

const createCategory = ({
  categoryIcon = "",
  saveError = null,
} = {}) => ({
  _id: CATEGORY_ID,
  categoryName: "Science",
  categoryIcon,

  async save() {
    if (saveError) {
      throw saveError;
    }

    return this;
  },

  toObject() {
    return {
      _id: this._id,
      categoryName: this.categoryName,
      categoryIcon: this.categoryIcon,
    };
  },
});

const createRequest = (
  category,
  overrides = {}
) => ({
  params: {
    id: CATEGORY_ID,
  },

  file: {
    buffer: randomBytes(32),
    mimetype: "image/png",
  },

  tenantContext,

  getTenantModel(modelName) {
    assert.equal(modelName, "Category");

    return {
      findById: async () => category,
    };
  },

  ...overrides,
});

const createdFiles = new Set();

const saveTestIcon = async () => {
  const result = await tenantCategoryIconService.saveIcon(
    tenantContext,
    randomBytes(32),
    "image/png"
  );

  createdFiles.add(result.fileName);

  return result;
};

const cleanupCreatedFiles = async () => {
  for (const fileName of createdFiles) {
    await tenantCategoryIconService.deleteIcon(
      tenantContext,
      fileName
    ).catch(() => {});
  }

  createdFiles.clear();

  const directory =
    await tenantCategoryIconService.getIconsDirectory(
      tenantContext
    );

  const tenantRoot = path.resolve(
    directory,
    "..",
    ".."
  );

  await fs.rm(tenantRoot, {
    recursive: true,
    force: true,
  });
};

after(async () => {
  await cleanupCreatedFiles();
});

test("uploads an icon and saves its generated filename to the tenant category", async () => {
  const category = createCategory();

  const req = createRequest(category);
  const res = createResponse();

  let nextError = null;

  await uploadTenantCategoryIcon(
    req,
    res,
    (error) => {
      nextError = error;
    }
  );

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  assert.match(
    category.categoryIcon,
    /^[0-9a-f-]+\.png$/i
  );

  assert.equal(
    res.body.data.category.categoryIconUrl,
    `/api/tenant/categories/${CATEGORY_ID}/icon`
  );

  createdFiles.add(category.categoryIcon);
});

test("removes a newly saved icon if the category database save fails", async () => {
  const category = createCategory({
    saveError: new Error("DATABASE_SAVE_FAILED"),
  });

  const req = createRequest(category);
  const res = createResponse();

  let nextError = null;

  await uploadTenantCategoryIcon(
    req,
    res,
    (error) => {
      nextError = error;
    }
  );

  assert.equal(
    nextError?.message,
    "DATABASE_SAVE_FAILED"
  );

  // The controller should have deleted the newly saved file.
  assert.equal(category.categoryIcon, "");

  const directory =
    await tenantCategoryIconService.getIconsDirectory(
      tenantContext
    );

  const remainingFiles = await fs.readdir(directory);

  assert.equal(remainingFiles.length, 0);
});

test("retrieves an icon with private response headers", async () => {
  const saved = await saveTestIcon();

  const category = createCategory({
    categoryIcon: saved.fileName,
  });

  const req = createRequest(category);
  const res = createResponse();

  await getTenantCategoryIcon(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);

  assert.equal(
    res.headers["Content-Type"],
    "image/png"
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
    saved.filePath
  );
});

test("returns 404 when the category has no managed icon", async () => {
  const category = createCategory({
    categoryIcon: "",
  });

  const req = createRequest(category);
  const res = createResponse();

  await getTenantCategoryIcon(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 404);

  assert.equal(
    res.body.code,
    "TENANT_CATEGORY_ICON_NOT_FOUND"
  );
});

test("deletes the icon reference and removes the managed file", async () => {
  const saved = await saveTestIcon();

  const category = createCategory({
    categoryIcon: saved.fileName,
  });

  const req = createRequest(category);
  const res = createResponse();

  await deleteTenantCategoryIcon(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(category.categoryIcon, "");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  const result = await tenantCategoryIconService.readIcon(
    tenantContext,
    saved.fileName
  );

  assert.equal(result, null);
  createdFiles.delete(saved.fileName);
});

test("does not delete a legacy shared-upload icon", async () => {
  const category = createCategory({
    categoryIcon: "/uploads/categories/legacy-icon.png",
  });

  const req = createRequest(category);
  const res = createResponse();

  await deleteTenantCategoryIcon(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(category.categoryIcon, "");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});
