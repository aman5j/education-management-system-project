
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

  assert.equal(
    route.stack.at(-1).handle,
    getTenantCategoryIcon
  );
});

test("registers icon upload middleware before its controller", () => {
  const route = findRoute("post", "/:id/icon");

  assert.ok(route);
  assert.equal(route.stack.length, 3);

  assert.equal(
    route.stack.at(-1).handle,
    uploadTenantCategoryIcon
  );

  assert.equal(
    route.stack.at(-2).handle.name,
    "tenantCategoryIconUpload"
  );
});

test("registers icon deletion route", () => {
  const route = findRoute("delete", "/:id/icon");

  assert.ok(route);

  assert.equal(
    route.stack.at(-1).handle,
    deleteTenantCategoryIcon
  );
});

test("category CRUD routes use the correct controllers", () => {
  assert.equal(
    findRoute("get", "/").stack.at(-1).handle,
    getTenantCategories
  );

  assert.equal(
    findRoute("get", "/:id").stack.at(-1).handle,
    getTenantCategory
  );

  assert.equal(
    findRoute("post", "/").stack.at(-1).handle,
    createTenantCategory
  );

  assert.equal(
    findRoute("put", "/:id").stack.at(-1).handle,
    updateTenantCategory
  );

  assert.equal(
    findRoute("delete", "/:id").stack.at(-1).handle,
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
