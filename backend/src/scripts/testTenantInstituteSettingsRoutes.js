
import test from "node:test";
import assert from "node:assert/strict";

import tenantInstituteSettingsRoutes from "../routes/tenantInstituteSettings.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

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

const getLayerIndex = (handler) =>
  stack.findIndex((layer) => layer.handle === handler);

const getRouteIndex = (route) =>
  stack.findIndex((layer) => layer.route === route);

test("tenant settings router applies tenant resolver before model attachment", () => {
  const resolverIndex = getLayerIndex(resolveTenant);
  const modelIndex = getLayerIndex(attachTenantModels);

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

test("public endpoints are registered before tenant authentication", () => {
  const authIndex = getLayerIndex(authenticateTenant);

  assert.ok(authIndex >= 0);

  const publicRoutes = [
    findRoute("get", "/public-branding"),
    findRoute("get", "/logo/:version"),
  ];

  for (const route of publicRoutes) {
    assert.ok(getRouteIndex(route) < authIndex);
  }
});

test("tenant authentication is registered before protected settings routes", () => {
  const authIndex = getLayerIndex(authenticateTenant);

  assert.ok(authIndex >= 0);

  const protectedRoutes = [
    findRoute("get", "/"),
    findRoute("put", "/"),
    findRoute("post", "/logo"),
  ];

  for (const route of protectedRoutes) {
    assert.ok(getRouteIndex(route) > authIndex);
  }
});

test("protected routes register admin role middleware after authentication", () => {
  const authIndex = getLayerIndex(authenticateTenant);

  assert.ok(authIndex >= 0);

  const roleLayer = stack[authIndex + 1];

  assert.ok(roleLayer);
  assert.equal(typeof roleLayer.handle, "function");

  const firstProtectedRouteIndex = Math.min(
    getRouteIndex(findRoute("get", "/")),
    getRouteIndex(findRoute("put", "/")),
    getRouteIndex(findRoute("post", "/logo"))
  );

  assert.ok(authIndex < authIndex + 1);
  assert.ok(authIndex + 1 < firstProtectedRouteIndex);
});

test("protected routes register permission middleware after role middleware", () => {
  const authIndex = getLayerIndex(authenticateTenant);

  assert.ok(authIndex >= 0);

  const roleLayer = stack[authIndex + 1];
  const permissionLayer = stack[authIndex + 2];

  assert.ok(roleLayer);
  assert.ok(permissionLayer);

  assert.equal(typeof roleLayer.handle, "function");
  assert.equal(typeof permissionLayer.handle, "function");

  const firstProtectedRouteIndex = Math.min(
    getRouteIndex(findRoute("get", "/")),
    getRouteIndex(findRoute("put", "/")),
    getRouteIndex(findRoute("post", "/logo"))
  );

  assert.ok(authIndex + 1 < authIndex + 2);
  assert.ok(authIndex + 2 < firstProtectedRouteIndex);
});

test("GET settings uses tenant settings controller", () => {
  const route = findRoute("get", "/");

  assert.equal(route.stack.length, 1);
  assert.equal(
    route.stack[0].handle,
    getTenantInstituteSettings
  );
});

test("PUT settings uses tenant update controller", () => {
  const route = findRoute("put", "/");

  assert.equal(route.stack.length, 1);
  assert.equal(
    route.stack[0].handle,
    updateTenantInstituteSettings
  );
});

test("logo upload uses multer middleware before tenant controller", () => {
  const route = findRoute("post", "/logo");

  assert.equal(route.stack.length, 2);

  // Multer creates a new middleware function for every .single() call.
  // Therefore, verify the registered middleware's function shape,
  // rather than comparing it with a newly generated function.
  assert.equal(
    typeof route.stack[0].handle,
    "function"
  );

  assert.equal(
    route.stack[0].handle.name,
    "multerMiddleware"
  );

  assert.equal(
    route.stack[1].handle,
    uploadTenantInstituteLogo
  );
});

test("legacy settings asset endpoint is not exposed in tenant router", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.equal(
    paths.includes("/assets/:assetType"),
    false
  );
});

test("tenant routes do not accept browser-supplied tenant identifiers", () => {
  const paths = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  for (const routePath of paths) {
    assert.equal(routePath.includes(":instituteId"), false);
    assert.equal(routePath.includes(":collection"), false);
    assert.equal(routePath.includes(":modelName"), false);
  }
});
