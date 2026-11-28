
import test from "node:test";
import assert from "node:assert/strict";

import {
  uploadTenantCourseImage,
  getTenantCourseImage,
  deleteTenantCourseImage,
} from "../controllers/tenantCourseImage.controller.js";

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

const next = (error) => {
  if (error) throw error;
};

test("upload rejects an invalid Course ID", async () => {
  const req = {
    params: { id: "invalid" },
    file: { buffer: Buffer.from("image"), mimetype: "image/png" },
  };

  const res = createResponse();

  await uploadTenantCourseImage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TENANT_COURSE_ID_INVALID");
});

test("image retrieval rejects an invalid Course ID", async () => {
  const req = {
    params: { id: "invalid" },
  };

  const res = createResponse();

  await getTenantCourseImage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TENANT_COURSE_ID_INVALID");
});

test("image deletion rejects an invalid Course ID", async () => {
  const req = {
    params: { id: "invalid" },
  };

  const res = createResponse();

  await deleteTenantCourseImage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TENANT_COURSE_ID_INVALID");
});

test("upload requires an image file", async () => {
  const req = {
    params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" },
  };

  const res = createResponse();

  await uploadTenantCourseImage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TENANT_COURSE_IMAGE_REQUIRED");
});
