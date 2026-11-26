
import test from "node:test";
import assert from "node:assert/strict";

import {
  requireTenantPermission,
  authorizeTenantRoles,
} from "../middleware/tenantAuthorization.middleware.js";

import {
  getAuthenticatedTenantStudentId,
  buildTenantStudentOwnershipFilter,
  tenantStudentOwnsResource,
} from "../services/tenantOwnership.js";

import {
  PERMISSIONS,
  STUDENT_PERMISSIONS,
} from "../constants/permissions.js";

const studentId = "65a111111111111111111111";

const makeRequest = ({
  role = "admin",
  assignedRole = null,
  studentRecord = null,
} = {}) => ({
  tenantContext: {
    instituteId: "65a222222222222222222222",
  },
  getTenantModel() {
    return {};
  },
  tenantUser: {
    role,
    assignedRole,
    studentRecord,
  },
});

const makeResponse = () => ({
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
  const res = makeResponse();
  let nextCalled = false;
  let nextError = null;

  middleware(req, res, (error) => {
    if (error) {
      nextError = error;
    } else {
      nextCalled = true;
    }
  });

  return {
    res,
    nextCalled,
    nextError,
  };
};

test("Admin receives institute permission access", () => {
  const req = makeRequest({ role: "admin" });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_CREATE),
    req
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test("Staff with the required permission is authorized", () => {
  const req = makeRequest({
    role: "staff",
    assignedRole: {
      isActive: true,
      permissions: [PERMISSIONS.STUDENTS_VIEW],
    },
  });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_VIEW),
    req
  );

  assert.equal(result.nextCalled, true);
});

test("Staff without the required permission is denied", () => {
  const req = makeRequest({
    role: "staff",
    assignedRole: {
      isActive: true,
      permissions: [PERMISSIONS.COURSES_VIEW],
    },
  });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_DELETE),
    req
  );

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(
    result.res.body.code,
    "TENANT_PERMISSION_FORBIDDEN"
  );
});

test("Staff with inactive assigned role is denied", () => {
  const req = makeRequest({
    role: "staff",
    assignedRole: {
      isActive: false,
      permissions: [PERMISSIONS.STUDENTS_VIEW],
    },
  });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_VIEW),
    req
  );

  assert.equal(result.res.statusCode, 403);
  assert.equal(
    result.res.body.code,
    "TENANT_ASSIGNED_ROLE_INVALID"
  );
});

test("Staff without assigned role is denied", () => {
  const req = makeRequest({ role: "staff" });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_VIEW),
    req
  );

  assert.equal(result.res.statusCode, 403);
});

test("Student can access an allowed self-service permission", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  const permission = STUDENT_PERMISSIONS[0];

  const result = runMiddleware(
    requireTenantPermission(permission),
    req
  );

  assert.equal(result.nextCalled, true);
});

test("Student cannot use Admin management permissions", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_VIEW),
    req
  );

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
});

test("Unauthenticated tenant request is rejected", () => {
  const req = {
    tenantContext: {
      instituteId: "65a222222222222222222222",
    },
    getTenantModel() {
      return {};
    },
  };

  const result = runMiddleware(
    requireTenantPermission(PERMISSIONS.STUDENTS_VIEW),
    req
  );

  assert.equal(result.res.statusCode, 401);
});

test("Invalid permission configuration is rejected", () => {
  const req = makeRequest({ role: "admin" });

  const result = runMiddleware(
    requireTenantPermission("unknown.permission"),
    req
  );

  assert.equal(result.res.statusCode, 500);
  assert.equal(
    result.res.body.code,
    "TENANT_PERMISSION_CONFIGURATION_INVALID"
  );
});

test("Role authorization accepts an allowed role", () => {
  const req = makeRequest({ role: "admin" });

  const result = runMiddleware(
    authorizeTenantRoles("admin"),
    req
  );

  assert.equal(result.nextCalled, true);
});

test("Role authorization rejects an unallowed role", () => {
  const req = makeRequest({ role: "student" });

  const result = runMiddleware(
    authorizeTenantRoles("admin"),
    req
  );

  assert.equal(result.res.statusCode, 403);
});

test("Student ID is derived from the authenticated account", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  assert.equal(
    getAuthenticatedTenantStudentId(req),
    studentId
  );
});

test("Student ownership filter uses authenticated Student ID", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  assert.deepEqual(
    buildTenantStudentOwnershipFilter(req),
    { student_id: studentId }
  );
});

test("Ownership filter rejects unsafe field names", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  assert.throws(
    () =>
      buildTenantStudentOwnershipFilter(
        req,
        "student_id.$ne"
      ),
    /TENANT_OWNERSHIP_FIELD_INVALID/
  );
});

test("Student cannot access another student's resource", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  assert.equal(
    tenantStudentOwnsResource(req, {
      student_id: "65a333333333333333333333",
    }),
    false
  );
});

test("Student can access their own resource", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: studentId,
  });

  assert.equal(
    tenantStudentOwnsResource(req, {
      student_id: studentId,
    }),
    true
  );
});

test("Student without linked Student record is rejected", () => {
  const req = makeRequest({
    role: "student",
    studentRecord: null,
  });

  assert.throws(
    () => getAuthenticatedTenantStudentId(req),
    /TENANT_STUDENT_RECORD_NOT_LINKED/
  );
});

test("Non-student cannot use student ownership helpers", () => {
  const req = makeRequest({
    role: "staff",
  });

  assert.throws(
    () => getAuthenticatedTenantStudentId(req),
    /TENANT_STUDENT_ACCESS_REQUIRED/
  );
});
