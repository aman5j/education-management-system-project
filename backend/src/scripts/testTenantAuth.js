
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
  createTenantAccessToken,
  createTenantRefreshToken,
  verifyTenantAccessToken,
  verifyTenantRefreshToken,
} from "../utils/tenantAuth.js";

// Test-only secrets. Never use these in .env or production.
process.env.TENANT_JWT_ACCESS_SECRET =
  "test-tenant-access-secret-0123456789-abcdef";

process.env.TENANT_JWT_REFRESH_SECRET =
  "test-tenant-refresh-secret-0123456789-abcdef";

process.env.PLATFORM_JWT_ACCESS_SECRET =
  "test-platform-access-secret-0123456789-abcdef";

process.env.JWT_ACCESS_SECRET =
  "test-legacy-access-secret-0123456789-abcdef";

const user = {
  _id: "65a111111111111111111111",
  email: "admin@example.test",
  role: "admin",
};

const instituteA = {
  instituteId: "65a222222222222222222222",
  collectionPrefix: "inst_65a222222222222222222222",
};

const instituteB = {
  instituteId: "65a333333333333333333333",
  collectionPrefix: "inst_65a333333333333333333333",
};

test("tenant access token contains its institute identity", () => {
  const token = createTenantAccessToken(user, instituteA);
  const decoded = verifyTenantAccessToken(token);

  assert.equal(decoded.type, "access");
  assert.equal(decoded.instituteId, instituteA.instituteId);
  assert.equal(decoded.tenantKey, instituteA.collectionPrefix);
  assert.equal(decoded.sub, user._id);
});

test("Institute A access token cannot match Institute B context", () => {
  const token = createTenantAccessToken(user, instituteA);
  const decoded = verifyTenantAccessToken(token);

  assert.notEqual(decoded.instituteId, instituteB.instituteId);
  assert.notEqual(decoded.tenantKey, instituteB.collectionPrefix);
});

test("tenant refresh token contains its institute identity", () => {
  const token = createTenantRefreshToken(user, instituteA);
  const decoded = verifyTenantRefreshToken(token);

  assert.equal(decoded.type, "refresh");
  assert.equal(decoded.instituteId, instituteA.instituteId);
  assert.equal(decoded.tenantKey, instituteA.collectionPrefix);
});

test("platform access token is rejected by tenant verification", () => {
  const platformToken = jwt.sign(
    {
      sub: user._id,
      type: "access",
    },
    process.env.PLATFORM_JWT_ACCESS_SECRET,
    {
      issuer: "ems-platform",
      audience: "ems-platform-admin",
    }
  );

  assert.throws(() => verifyTenantAccessToken(platformToken));
});

test("legacy EMS access token is rejected by tenant verification", () => {
  const legacyToken = jwt.sign(
    {
      sub: user._id,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET
  );

  assert.throws(() => verifyTenantAccessToken(legacyToken));
});
