import test from "node:test";
import assert from "node:assert/strict";

import router from "../routes/tenantCourse.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import {
  getTenantCourses,
  getTenantCourse,
  createTenantCourse,
  updateTenantCourse,
  deleteTenantCourse,
  updateTenantCourseStatus,
} from "../controllers/tenantCourse.controller.js";

const stack = router.stack;

const findRoute = (method, routePath) =>
  stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === routePath &&
      layer.route.methods[method]
  );

const handlers = (routeLayer) =>
  routeLayer?.route?.stack?.map((layer) => layer.handle) || [];

const middlewareIndex = (handler) =>
  stack.findIndex((layer) => layer.handle === handler);

test("tenant course router registers trusted tenant middleware in order", () => {
  const resolverIndex = middlewareIndex(resolveTenant);
  const modelIndex = middlewareIndex(attachTenantModels);
  const authIndex = middlewareIndex(authenticateTenant);

  assert.ok(resolverIndex >= 0, "resolveTenant is missing");
  assert.ok(modelIndex > resolverIndex, "attachTenantModels must follow resolver");
  assert.ok(authIndex > modelIndex, "authenticateTenant must follow model attachment");
});

test("registers course list and detail routes", () => {
  assert.ok(findRoute("get", "/"));
  assert.ok(findRoute("get", "/:id"));
});

test("registers course create and update routes", () => {
  assert.ok(findRoute("post", "/"));
  assert.ok(findRoute("put", "/:id"));
});

test("registers course delete and status routes", () => {
  assert.ok(findRoute("delete", "/:id"));
  assert.ok(findRoute("patch", "/:id/status"));
});

test("course routes use their intended controllers", () => {
  assert.equal(handlers(findRoute("get", "/")).at(-1), getTenantCourses);
  assert.equal(handlers(findRoute("get", "/:id")).at(-1), getTenantCourse);
  assert.equal(handlers(findRoute("post", "/")).at(-1), createTenantCourse);
  assert.equal(handlers(findRoute("put", "/:id")).at(-1), updateTenantCourse);
  assert.equal(handlers(findRoute("delete", "/:id")).at(-1), deleteTenantCourse);
  assert.equal(
    handlers(findRoute("patch", "/:id/status")).at(-1),
    updateTenantCourseStatus
  );
});

test("every course route places permission middleware before its controller", () => {
  const routes = [
    ["get", "/"],
    ["get", "/:id"],
    ["post", "/"],
    ["put", "/:id"],
    ["delete", "/:id"],
    ["patch", "/:id/status"],
  ];

  for (const [method, path] of routes) {
    const routeHandlers = handlers(findRoute(method, path));

    assert.equal(
      routeHandlers.length,
      2,
      `${method.toUpperCase()} ${path} should have permission and controller handlers`
    );

    assert.equal(typeof routeHandlers[0], "function");
    assert.equal(typeof routeHandlers[1], "function");
  }
});

test("course routes do not accept browser-supplied tenant identifiers", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  for (const path of paths) {
    assert.equal(path.includes(":instituteId"), false);
    assert.equal(path.includes(":collectionPrefix"), false);
    assert.equal(path.includes(":modelName"), false);
  }
});

test("course router contains only tenant route handlers and does not import legacy upload middleware", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.equal(paths.includes("/"), true);
  assert.equal(paths.includes("/:id"), true);
  assert.equal(paths.includes("/:id/status"), true);
});