
import test from "node:test";
import assert from "node:assert/strict";

import router from "../routes/tenantCourse.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import tenantCourseImageUpload from "../middleware/tenantCourseImageUpload.middleware.js";

import {
  uploadTenantCourseImage,
  getTenantCourseImage,
  deleteTenantCourseImage,
} from "../controllers/tenantCourseImage.controller.js";

const stack = router.stack;

const findRoute = (method, routePath) =>
  stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === routePath &&
      layer.route.methods[method]
  );

const handlers = (route) =>
  route?.route?.stack?.map((layer) => layer.handle) || [];

test("trusted tenant middleware is registered in correct order", () => {
  const index = (handler) =>
    stack.findIndex((layer) => layer.handle === handler);

  assert.ok(index(resolveTenant) >= 0);
  assert.ok(index(attachTenantModels) > index(resolveTenant));
  assert.ok(index(authenticateTenant) > index(attachTenantModels));
});

test("registers all three Course image endpoints", () => {
  assert.ok(findRoute("get", "/:id/image"));
  assert.ok(findRoute("post", "/:id/image"));
  assert.ok(findRoute("delete", "/:id/image"));
});

test("GET image uses permission before image controller", () => {
  const route = handlers(findRoute("get", "/:id/image"));

  assert.equal(route.length, 2);
  assert.equal(route.at(-1), getTenantCourseImage);
});

test("POST image uses permission, upload middleware and controller", () => {
  const route = handlers(findRoute("post", "/:id/image"));

  assert.equal(route.length, 3);
  assert.equal(route[1], tenantCourseImageUpload);
  assert.equal(route[2], uploadTenantCourseImage);
});

test("DELETE image uses permission before image controller", () => {
  const route = handlers(findRoute("delete", "/:id/image"));

  assert.equal(route.length, 2);
  assert.equal(route.at(-1), deleteTenantCourseImage);
});

test("existing tenant Course CRUD routes remain registered", () => {
  assert.ok(findRoute("get", "/"));
  assert.ok(findRoute("get", "/:id"));
  assert.ok(findRoute("post", "/"));
  assert.ok(findRoute("put", "/:id"));
  assert.ok(findRoute("delete", "/:id"));
  assert.ok(findRoute("patch", "/:id/status"));
});
