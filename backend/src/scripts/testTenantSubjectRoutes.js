
import test from "node:test";
import assert from "node:assert/strict";

import router from "../routes/tenantSubject.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import {
  getTenantSubjects,
  getTenantSubject,
  createTenantSubject,
  updateTenantSubject,
  updateTenantSubjectStatus,
  deleteTenantSubject,
} from "../controllers/tenantSubject.controller.js";

const stack = router.stack;

const findRoute = (method, routePath) =>
  stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === routePath &&
      layer.route.methods[method]
  );

// Express 5 can store multiple HTTP methods
// in the same route layer. Filter by method.
const handlers = (routeLayer, method) =>
  routeLayer?.route?.stack
    ?.filter((layer) => layer.method === method)
    .map((layer) => layer.handle) || [];

const middlewareIndex = (handler) =>
  stack.findIndex((layer) => layer.handle === handler);

test("tenant subject router registers trusted tenant middleware in order", () => {
  const resolverIndex = middlewareIndex(resolveTenant);
  const modelIndex = middlewareIndex(attachTenantModels);
  const authIndex = middlewareIndex(authenticateTenant);

  assert.ok(resolverIndex >= 0, "resolveTenant is missing");

  assert.ok(
    modelIndex > resolverIndex,
    "attachTenantModels must follow resolver"
  );

  assert.ok(
    authIndex > modelIndex,
    "authenticateTenant must follow model attachment"
  );
});

test("registers subject list and create routes", () => {
  assert.ok(findRoute("get", "/"));
  assert.ok(findRoute("post", "/"));
});

test("registers subject detail, update and delete routes", () => {
  assert.ok(findRoute("get", "/:id"));
  assert.ok(findRoute("patch", "/:id"));
  assert.ok(findRoute("delete", "/:id"));
});

test("registers subject status update route", () => {
  assert.ok(findRoute("patch", "/:id/status"));
});

test("subject routes use their intended controllers", () => {
  assert.equal(
    handlers(findRoute("get", "/"), "get").at(-1),
    getTenantSubjects
  );

  assert.equal(
    handlers(findRoute("post", "/"), "post").at(-1),
    createTenantSubject
  );

  assert.equal(
    handlers(findRoute("get", "/:id"), "get").at(-1),
    getTenantSubject
  );

  assert.equal(
    handlers(findRoute("patch", "/:id"), "patch").at(-1),
    updateTenantSubject
  );

  assert.equal(
    handlers(findRoute("delete", "/:id"), "delete").at(-1),
    deleteTenantSubject
  );

  assert.equal(
    handlers(findRoute("patch", "/:id/status"), "patch").at(-1),
    updateTenantSubjectStatus
  );
});

test("every subject route places permission middleware before its controller", () => {
  const routes = [
    ["get", "/"],
    ["post", "/"],
    ["get", "/:id"],
    ["patch", "/:id"],
    ["delete", "/:id"],
    ["patch", "/:id/status"],
  ];

  for (const [method, path] of routes) {
    const routeHandlers = handlers(findRoute(method, path), method);

    assert.equal(
      routeHandlers.length,
      2,
      `${method.toUpperCase()} ${path} should have permission and controller handlers`
    );

    assert.equal(typeof routeHandlers[0], "function");
    assert.equal(typeof routeHandlers[1], "function");
  }
});

test("tenant subject router does not expose Question Bank endpoints", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.equal(
    paths.some((path) => path.includes("question-bank")),
    false
  );

  assert.equal(
    paths.some((path) => path.includes("import")),
    false
  );
});

test("subject routes do not accept browser-supplied tenant identifiers", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  for (const path of paths) {
    assert.equal(path.includes(":instituteId"), false);
    assert.equal(path.includes(":collectionPrefix"), false);
    assert.equal(path.includes(":modelName"), false);
  }
});
