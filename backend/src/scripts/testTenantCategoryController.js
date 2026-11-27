
import test from "node:test";
import assert from "node:assert/strict";

import {
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
} from "../controllers/tenantCategory.controller.js";

const CATEGORY_ID = "6b098f3ecfef527d1a4a93b4";

const createResponse = () => ({
  statusCode: 200,
  body: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  },
});

const createCategory = ({
  categoryName = "Science",
  saveError = null,
} = {}) => ({
  _id: CATEGORY_ID,
  categoryName,
  displayOrder: 1,
  status: "Active",
  categoryIcon: "",

  async save() {
    if (saveError) throw saveError;
    return this;
  },

  async deleteOne() {
    this.deleted = true;
  },
});

const createRequest = ({
  body = {},
  category = null,
  courseCount = 0,
  duplicate = null,
} = {}) => ({
  params: {
    id: CATEGORY_ID,
  },

  body,
  query: {},

  getTenantModel(modelName) {
    if (modelName === "Category") {
      return {
        findOne: async () => duplicate,
        findById: async () => category,
        create: async (data) => ({
          ...data,
          _id: CATEGORY_ID,
        }),
      };
    }

    if (modelName === "Course") {
      return {
        countDocuments: async () => courseCount,
      };
    }

    throw new Error(
      `Unexpected tenant model: ${modelName}`
    );
  },
});

test("creates a category with valid data", async () => {
  const req = createRequest({
    body: {
      categoryName: "Science",
      displayOrder: 1,
      status: "Active",
    },
  });

  const res = createResponse();

  await createTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(
    res.body.data.categoryName,
    "Science"
  );
});

test("rejects a category name shorter than two characters", async () => {
  const req = createRequest({
    body: {
      categoryName: "A",
      displayOrder: 1,
      status: "Active",
    },
  });

  const res = createResponse();

  await createTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 400);
});

test("rejects invalid category status", async () => {
  const req = createRequest({
    body: {
      categoryName: "Science",
      displayOrder: 1,
      status: "Pending",
    },
  });

  const res = createResponse();

  await createTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 400);
});

test("rejects a duplicate category name", async () => {
  const req = createRequest({
    body: {
      categoryName: "Science",
      displayOrder: 1,
      status: "Active",
    },
    duplicate: {
      _id: "6b098f3ecfef527d1a4a93b5",
    },
  });

  const res = createResponse();

  await createTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
});

test("blocks category rename when courses still reference its name", async () => {
  const category = createCategory();

  const req = createRequest({
    body: {
      categoryName: "Physics",
    },
    category,
    courseCount: 2,
  });

  const res = createResponse();

  await updateTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.equal(category.categoryName, "Science");
  assert.equal(
    res.body.data.coursesUsingCategory,
    2
  );
});

test("allows category rename when no courses reference it", async () => {
  const category = createCategory();

  const req = createRequest({
    body: {
      categoryName: "Physics",
    },
    category,
    courseCount: 0,
  });

  const res = createResponse();

  await updateTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(category.categoryName, "Physics");
});

test("blocks category deletion when courses reference it", async () => {
  const category = createCategory();

  const req = createRequest({
    category,
    courseCount: 3,
  });

  const res = createResponse();

  await deleteTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.equal(category.deleted, undefined);
});

test("deletes a category when no courses reference it", async () => {
  const category = createCategory();

  const req = createRequest({
    category,
    courseCount: 0,
  });

  const res = createResponse();

  await deleteTenantCategory(
    req,
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(category.deleted, true);
});
