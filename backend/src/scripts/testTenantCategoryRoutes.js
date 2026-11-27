
import test from "node:test";
import assert from "node:assert/strict";

import router from "../routes/tenantCategory.routes.js";

import {
  getTenantCategories,
  getTenantCategory,
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
} from "../controllers/tenantCategory.controller.js";

import {
  uploadTenantCategoryIcon,
  getTenantCategoryIcon,
  deleteTenantCategoryIcon,
} from "../controllers/tenantCategoryIcon.controller.js";

const stack = router.stack;

const findRoute = (method, routePath) =>
  stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === routePath &&
      layer.route.methods[method]
  );

// Express 5 stores route handlers in layer.route.stack.
const getHandlers = (routeLayer) =>
  routeLayer?.route?.stack?.map(
    (handlerLayer) => handlerLayer.handle
  ) || [];

test("tenant category router has trusted tenant resolution middleware", () => {
  const middlewareLayers = stack.filter(
    (layer) => !layer.route
  );

  assert.ok(middlewareLayers.length >= 3);
});

test("registers category list and detail routes", () => {
  assert.ok(findRoute("get", "/"));
  assert.ok(findRoute("get", "/:id"));
});

test("registers category create, update and delete routes", () => {
  assert.ok(findRoute("post", "/"));
  assert.ok(findRoute("put", "/:id"));
  assert.ok(findRoute("delete", "/:id"));
});

test("registers icon retrieval route", () => {
  const route = findRoute("get", "/:id/icon");

  assert.ok(route);

  const handlers = getHandlers(route);

  assert.equal(handlers.length, 2);
  assert.equal(
    handlers.at(-1),
    getTenantCategoryIcon
  );
});

test("registers icon upload middleware before its controller", () => {
  const route = findRoute("post", "/:id/icon");

  assert.ok(route);

  const handlers = getHandlers(route);

  assert.equal(handlers.length, 3);

  assert.equal(
    handlers.at(-1),
    uploadTenantCategoryIcon
  );

  assert.equal(
    handlers.at(-2).name,
    "tenantCategoryIconUpload"
  );
});

test("registers icon deletion route", () => {
  const route = findRoute("delete", "/:id/icon");

  assert.ok(route);

  const handlers = getHandlers(route);

  assert.equal(handlers.length, 2);
  assert.equal(
    handlers.at(-1),
    deleteTenantCategoryIcon
  );
});

test("category CRUD routes use the correct controllers", () => {
  assert.equal(
    getHandlers(findRoute("get", "/")).at(-1),
    getTenantCategories
  );

  assert.equal(
    getHandlers(findRoute("get", "/:id")).at(-1),
    getTenantCategory
  );

  assert.equal(
    getHandlers(findRoute("post", "/")).at(-1),
    createTenantCategory
  );

  assert.equal(
    getHandlers(findRoute("put", "/:id")).at(-1),
    updateTenantCategory
  );

  assert.equal(
    getHandlers(findRoute("delete", "/:id")).at(-1),
    deleteTenantCategory
  );
});

test("icon endpoints are registered before the generic category detail route", () => {
  const iconGetIndex = stack.findIndex(
    (layer) =>
      layer.route?.path === "/:id/icon" &&
      layer.route.methods.get
  );

  const detailIndex = stack.findIndex(
    (layer) =>
      layer.route?.path === "/:id" &&
      layer.route.methods.get
  );

  assert.ok(iconGetIndex >= 0);
  assert.ok(detailIndex >= 0);
  assert.ok(iconGetIndex < detailIndex);
});

test("tenant category routes do not accept browser-supplied tenant identifiers", () => {
  const routePaths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  for (const routePath of routePaths) {
    assert.equal(
      routePath.includes(":instituteId"),
      false
    );

    assert.equal(
      routePath.includes(":collectionPrefix"),
      false
    );
  }
});
