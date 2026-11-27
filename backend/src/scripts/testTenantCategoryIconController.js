
import test from "node:test";
import assert from "node:assert/strict";

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

    set(headers) {
      this.headers = headers;
      return this;
    },

    sendFile(filePath) {
      this.sentFile = filePath;
      return this;
    },
  };

  return response;
};

const createCategory = ({
  categoryIcon = "",
  saveError = null,
} = {}) => ({
  _id: CATEGORY_ID,
  categoryName: "Science",
  categoryIcon,

  async save() {
    if (saveError) throw saveError;
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

const createRequest = (category) => ({
  params: {
    id: CATEGORY_ID,
  },

  file: {
    buffer: Buffer.from("test-image"),
    mimetype: "image/png",
  },

  tenantContext,

  getTenantModel(modelName) {
    assert.equal(modelName, "Category");

    return {
      findById: async () => category,
    };
  },
});

test("uploads an icon and saves its generated filename to the tenant category", async (t) => {
  const category = createCategory();

  let savedFilename = null;

  t.mock.method(
    tenantCategoryIconService,
    "saveIcon",
    async () => {
      savedFilename =
        "12345678-1234-4234-8234-123456789abc.png";

      return {
        fileName: savedFilename,
      };
    }
  );

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
  assert.equal(category.categoryIcon, savedFilename);

  assert.equal(
    res.body.data.category.categoryIconUrl,
    `/api/tenant/categories/${CATEGORY_ID}/icon`
  );
});

test("removes a newly saved icon if the category database save fails", async (t) => {
  const category = createCategory({
    saveError: new Error("DATABASE_SAVE_FAILED"),
  });

  const savedFilename =
    "12345678-1234-4234-8234-123456789abc.png";

  let deletedFilename = null;

  t.mock.method(
    tenantCategoryIconService,
    "saveIcon",
    async () => ({
      fileName: savedFilename,
    })
  );

  t.mock.method(
    tenantCategoryIconService,
    "deleteIcon",
    async (_context, fileName) => {
      deletedFilename = fileName;
      return true;
    }
  );

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
    deletedFilename,
    savedFilename
  );

  assert.equal(
    nextError?.message,
    "DATABASE_SAVE_FAILED"
  );
});

test("retrieves an icon with private response headers", async (t) => {
  const filename =
    "12345678-1234-4234-8234-123456789abc.png";

  const category = createCategory({
    categoryIcon: filename,
  });

  t.mock.method(
    tenantCategoryIconService,
    "readIcon",
    async (context, requestedFilename) => {
      assert.deepEqual(context, tenantContext);
      assert.equal(requestedFilename, filename);

      return {
        path: "C:/private/category-icon.png",
        size: 100,
        mimeType: "image/png",
      };
    }
  );

  const req = createRequest(category);
  const res = createResponse();

  await getTenantCategoryIcon(
    req,
    res,
    (error) => {
      throw error;
    }
  );

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
    "C:/private/category-icon.png"
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

test("deletes the icon reference and removes the managed file", async (t) => {
  const filename =
    "12345678-1234-4234-8234-123456789abc.png";

  const category = createCategory({
    categoryIcon: filename,
  });

  let deletedFilename = null;

  t.mock.method(
    tenantCategoryIconService,
    "deleteIcon",
    async (context, requestedFilename) => {
      assert.deepEqual(context, tenantContext);
      deletedFilename = requestedFilename;
      return true;
    }
  );

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
  assert.equal(deletedFilename, filename);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("does not delete a legacy shared-upload icon", async (t) => {
  const category = createCategory({
    categoryIcon: "/uploads/categories/legacy-icon.png",
  });

  let deleteCalled = false;

  t.mock.method(
    tenantCategoryIconService,
    "deleteIcon",
    async () => {
      deleteCalled = true;
    }
  );

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
  assert.equal(deleteCalled, false);
  assert.equal(res.statusCode, 200);
});
