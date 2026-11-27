
import test from "node:test";
import assert from "node:assert/strict";

import tenantInstituteSettingsRoutes from "../routes/tenantInstituteSettings.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import {
  authorizeTenantRoles,
  requireTenantPermission,
} from "../middleware/tenantAuthorization.middleware.js";

import uploadInstituteLogo from "../middleware/instituteLogoUpload.js";

import {
  getTenantInstituteSettings,
  getTenantPublicInstituteBranding,
  getTenantInstituteLogo,
  updateTenantInstituteSettings,
  uploadTenantInstituteLogo,
} from "../controllers/tenantInstituteSettings.controller.js";

const stack = tenantInstituteSettingsRoutes.stack;

const findRoute = (method, routePath) => {
  const layer = stack.find(
    (item) =>
      item.route &&
      item.route.path === routePath &&
      item.route.methods[method]
  );

  assert.ok(
    layer,
    `Missing route: ${method.toUpperCase()} ${routePath}`
  );

  return layer.route;
};

const getGlobalMiddlewareIndex = (middleware) =>
  stack.findIndex((layer) => layer.handle === middleware);

test("tenant settings router applies tenant resolver first", () => {
  const resolverIndex = getGlobalMiddlewareIndex(resolveTenant);
  const modelIndex = getGlobalMiddlewareIndex(attachTenantModels);

  assert.ok(resolverIndex >= 0);
  assert.ok(modelIndex > resolverIndex);
});

test("tenant settings router registers public branding endpoint", () => {
  const route = findRoute("get", "/public-branding");

  assert.equal(route.stack.length, 1);
  assert.equal(
    route.stack[0].handle,
    getTenantPublicInstituteBranding
  );
});

test("tenant settings router registers public logo endpoint", () => {
  const route = findRoute("get", "/logo/:version");

  assert.equal(route.stack.length, 1);
  assert.equal(
    route.stack[0].handle,
    getTenantInstituteLogo
  );
});

test("public endpoints do not require tenant login middleware", () => {
  const authIndex = getGlobalMiddlewareIndex(authenticateTenant);

  const publicRoutes = [
    findRoute("get", "/public-branding"),
    findRoute("get", "/logo/:version"),
  ];

  assert.ok(authIndex >= 0);

  for (const route of publicRoutes) {
    const routeLayerIndex = stack.findIndex(
      (layer) => layer.route === route
    );

    assert.ok(
      routeLayerIndex < authIndex,
      "Public endpoint must be registered before tenant authentication"
    );
  }
});

test("tenant authentication is installed before protected routes", () => {
  const authIndex = getGlobalMiddlewareIndex(authenticateTenant);

  assert.ok(authIndex >= 0);

  const protectedRoutes = [
    findRoute("get", "/"),
    findRoute("put", "/"),
    findRoute("post", "/logo"),
  ];

  for (const route of protectedRoutes) {
    const routeLayerIndex = stack.findIndex(
      (layer) => layer.route === route
    );

    assert.ok(routeLayerIndex > authIndex);
  }
});

test("protected settings routes require admin role", () => {
  const roleLayer = stack.find(
    (layer) =>
      layer.handle?.name === "middleware"
  );

  assert.ok(
    roleLayer,
    "Expected protected role middleware to be registered"
  );

  const protectedRouteIndexes = [
    stack.findIndex(
      (layer) => layer.route === findRoute("get", "/")
    ),
    stack.findIndex(
      (layer) => layer.route === findRoute("put", "/")
    ),
    stack.findIndex(
      (layer) => layer.route === findRoute("post", "/logo")
    ),
  ];

  const roleMiddlewareIndex = stack.findIndex(
    (layer) => layer.handle === roleLayer.handle
  );

  assert.ok(roleMiddlewareIndex >= 0);

  for (const routeIndex of protectedRouteIndexes) {
    assert.ok(routeIndex > roleMiddlewareIndex);
  }
});

test("protected settings routes require settings.manage permission", () => {
  const protectedRouteIndexes = [
    stack.findIndex(
      (layer) => layer.route === findRoute("get", "/")
    ),
    stack.findIndex(
      (layer) => layer.route === findRoute("put", "/")
    ),
    stack.findIndex(
      (layer) => layer.route === findRoute("post", "/logo")
    ),
  ];

  const permissionIndex = stack.findIndex(
    (layer) =>
      layer.handle?.name === "middleware" &&
      layer !== stack.find(
        (item) => item.handle === authenticateTenant
      )
  );

  assert.ok(permissionIndex >= 0);

  for (const routeIndex of protectedRouteIndexes) {
    assert.ok(routeIndex > permissionIndex);
  }
});

test("GET settings uses tenant settings controller", () => {
  const route = findRoute("get", "/");

  assert.equal(route.stack.length, 1);
  assert.equal(route.stack[0].handle, getTenantInstituteSettings);
});

test("PUT settings uses tenant update controller", () => {
  const route = findRoute("put", "/");

  assert.equal(route.stack.length, 1);
  assert.equal(route.stack[0].handle, updateTenantInstituteSettings);
});

test("logo upload uses memory upload middleware before tenant controller", () => {
  const route = findRoute("post", "/logo");

  assert.equal(route.stack.length, 2);
  assert.equal(
    route.stack[0].handle,
    uploadInstituteLogo.single("logo")
  );

  assert.equal(
    route.stack[1].handle,
    uploadTenantInstituteLogo
  );
});

test("legacy settings endpoints are not mounted inside tenant settings router", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.equal(paths.includes("/assets/:assetType"), false);
});

test("tenant settings router does not expose institute ID or collection parameters", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  for (const routePath of paths) {
    assert.equal(routePath.includes(":instituteId"), false);
    assert.equal(routePath.includes(":collection"), false);
    assert.equal(routePath.includes(":modelName"), false);
  }
});
