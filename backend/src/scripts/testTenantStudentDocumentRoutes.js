
import test from "node:test";
import assert from "node:assert/strict";

import tenantStudentDocumentRoutes from "../routes/tenantStudentDocument.routes.js";

import { resolveTenant } from "../middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "../middleware/tenantModelContext.middleware.js";
import { authenticateTenant } from "../middleware/tenantAuth.middleware.js";

import {
  getTenantStudentDocuments,
  uploadTenantStudentDocuments,
  viewTenantStudentDocument,
  downloadTenantStudentDocument,
  deleteTenantStudentDocument,
} from "../controllers/tenantStudentDocument.controller.js";

import tenantStudentDocumentUpload from "../middleware/tenantStudentDocumentUpload.middleware.js";

const routeStack = tenantStudentDocumentRoutes.stack;

const getRoute = (method, routePath) => {
  const layer = routeStack.find(
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

const runMiddleware = (middleware, req) => {
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test("tenant router applies resolver, model accessor and authentication in order", () => {
  const resolverIndex = routeStack.findIndex(
    (layer) => layer.handle === resolveTenant
  );

  const modelIndex = routeStack.findIndex(
    (layer) => layer.handle === attachTenantModels
  );

  const authIndex = routeStack.findIndex(
    (layer) => layer.handle === authenticateTenant
  );

  assert.ok(resolverIndex >= 0);
  assert.ok(modelIndex > resolverIndex);
  assert.ok(authIndex > modelIndex);
});

test("registers all five admin/staff document routes", () => {
  const expected = [
    ["get", "/students/:studentId/documents"],
    ["post", "/students/:studentId/documents"],
    ["get", "/students/:studentId/documents/:documentId/view"],
    ["get", "/students/:studentId/documents/:documentId/download"],
    ["delete", "/students/:studentId/documents/:documentId"],
  ];

  for (const [method, routePath] of expected) {
    getRoute(method, routePath);
  }
});

test("registers all three student self-service routes", () => {
  const expected = [
    ["get", "/student-portal/documents"],
    ["get", "/student-portal/documents/:documentId/view"],
    ["get", "/student-portal/documents/:documentId/download"],
  ];

  for (const [method, routePath] of expected) {
    getRoute(method, routePath);
  }
});

test("admin document list route uses role, permission and controller in order", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  assert.equal(route.stack.length, 3);
  assert.equal(route.stack[2].handle, getTenantStudentDocuments);
});

test("admin upload route checks authorization before upload middleware", () => {
  const route = getRoute(
    "post",
    "/students/:studentId/documents"
  );

  assert.equal(route.stack.length, 4);
  assert.equal(route.stack[2].handle, tenantStudentDocumentUpload);
  assert.equal(route.stack[3].handle, uploadTenantStudentDocuments);
});

test("admin preview route uses the tenant preview controller", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents/:documentId/view"
  );

  assert.equal(route.stack.length, 3);
  assert.equal(route.stack[2].handle, viewTenantStudentDocument);
});

test("admin download route uses the tenant download controller", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents/:documentId/download"
  );

  assert.equal(route.stack.length, 3);
  assert.equal(route.stack[2].handle, downloadTenantStudentDocument);
});

test("admin delete route uses the tenant delete controller", () => {
  const route = getRoute(
    "delete",
    "/students/:studentId/documents/:documentId"
  );

  assert.equal(route.stack.length, 3);
  assert.equal(route.stack[2].handle, deleteTenantStudentDocument);
});

test("student list route does not accept a browser student ID", () => {
  const route = getRoute(
    "get",
    "/student-portal/documents"
  );

  assert.equal(route.stack.length, 3);
  assert.equal(route.stack[2].handle, getTenantStudentDocuments);
});

test("student preview and download use tenant document controllers", () => {
  const preview = getRoute(
    "get",
    "/student-portal/documents/:documentId/view"
  );

  const download = getRoute(
    "get",
    "/student-portal/documents/:documentId/download"
  );

  assert.equal(preview.stack[2].handle, viewTenantStudentDocument);
  assert.equal(download.stack[2].handle, downloadTenantStudentDocument);
});

test("student routes do not expose upload or delete endpoints", () => {
  const studentPaths = routeStack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
    }))
    .filter((item) =>
      item.path.startsWith("/student-portal/")
    );

  assert.equal(
    studentPaths.some((item) => item.methods.post),
    false
  );

  assert.equal(
    studentPaths.some((item) => item.methods.delete),
    false
  );
});

test("admin route permission middleware allows an admin account", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  const permissionMiddleware = route.stack[1].handle;

  const result = runMiddleware(permissionMiddleware, {
    tenantUser: { role: "admin" },
    tenantContext: { instituteId: "institute-a" },
    getTenantModel() {},
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test("staff without students.update permission is denied", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  const permissionMiddleware = route.stack[1].handle;

  const result = runMiddleware(permissionMiddleware, {
    tenantUser: {
      role: "staff",
      assignedRole: {
        isActive: true,
        permissions: ["students.view"],
      },
    },
    tenantContext: { instituteId: "institute-a" },
    getTenantModel() {},
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(
    result.res.body.code,
    "TENANT_PERMISSION_FORBIDDEN"
  );
});

test("staff with students.update permission is allowed", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  const permissionMiddleware = route.stack[1].handle;

  const result = runMiddleware(permissionMiddleware, {
    tenantUser: {
      role: "staff",
      assignedRole: {
        isActive: true,
        permissions: ["students.update"],
      },
    },
    tenantContext: { instituteId: "institute-a" },
    getTenantModel() {},
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test("student self-service permission is accepted by student route", () => {
  const route = getRoute(
    "get",
    "/student-portal/documents"
  );

  const permissionMiddleware = route.stack[1].handle;

  const result = runMiddleware(permissionMiddleware, {
    tenantUser: { role: "student" },
    tenantContext: { instituteId: "institute-a" },
    getTenantModel() {},
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test("student cannot use the admin students.update permission", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  const permissionMiddleware = route.stack[1].handle;

  const result = runMiddleware(permissionMiddleware, {
    tenantUser: { role: "student" },
    tenantContext: { instituteId: "institute-a" },
    getTenantModel() {},
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
});

test("student role middleware rejects admin and staff roles on student routes", () => {
  const route = getRoute(
    "get",
    "/student-portal/documents"
  );

  const roleMiddleware = route.stack[0].handle;

  for (const role of ["admin", "staff"]) {
    const result = runMiddleware(roleMiddleware, {
      tenantUser: { role },
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
    assert.equal(
      result.res.body.code,
      "TENANT_ROLE_FORBIDDEN"
    );
  }
});

test("admin/staff role middleware rejects student accounts on management routes", () => {
  const route = getRoute(
    "get",
    "/students/:studentId/documents"
  );

  const roleMiddleware = route.stack[0].handle;

  const result = runMiddleware(roleMiddleware, {
    tenantUser: { role: "student" },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(
    result.res.body.code,
    "TENANT_ROLE_FORBIDDEN"
  );
});
