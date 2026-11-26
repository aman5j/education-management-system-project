
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
  createTenantAccessToken,
  createTenantRefreshToken,
  verifyTenantAccessToken,
  verifyTenantRefreshToken,
} from "../utils/tenantAuth.js";

import {
  authenticateTenant,
} from "../middleware/tenantAuth.middleware.js";

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
  status: "active",
};

const instituteA = {
  instituteId: "65a222222222222222222222",
  collectionPrefix: "inst_65a222222222222222222222",
};

const instituteB = {
  instituteId: "65a333333333333333333333",
  collectionPrefix: "inst_65a333333333333333333333",
};

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

const makeTenantRequest = ({
  token,
  institute = instituteA,
  account = user,
}) => {
  let databaseLookups = 0;

  const User = {
    findById(id) {
      databaseLookups += 1;

      assert.equal(id, account._id);

      return {
        async populate() {
          return account;
        },
      };
    },
  };

  return {
    req: {
      headers: {
        authorization: `Bearer ${token}`,
      },
      tenantContext: {
        instituteId: institute.instituteId,
        collectionPrefix: institute.collectionPrefix,
      },
      tenantModels: { User },
    },
    get databaseLookups() {
      return databaseLookups;
    },
  };
};

const runMiddleware = async (req) => {
  const res = makeResponse();

  let nextCalled = false;
  let nextError = null;

  await authenticateTenant(req, res, (error) => {
    if (error) {
      nextError = error;
      return;
    }

    nextCalled = true;
  });

  return {
    res,
    nextCalled,
    nextError,
  };
};

test("tenant access token contains its institute identity", () => {
  const token = createTenantAccessToken(user, instituteA);
  const decoded = verifyTenantAccessToken(token);

  assert.equal(decoded.type, "access");
  assert.equal(decoded.instituteId, instituteA.instituteId);
  assert.equal(decoded.tenantKey, instituteA.collectionPrefix);
  assert.equal(decoded.sub, user._id);
  assert.equal(decoded.role, "admin");
});

test("tenant access token uses the configured short lifetime", () => {
  process.env.TENANT_JWT_ACCESS_EXPIRES_IN = "15m";

  const token = createTenantAccessToken(user, instituteA);
  const decoded = verifyTenantAccessToken(token);

  assert.equal(decoded.exp - decoded.iat, 15 * 60);
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

test("tenant middleware rejects Institute A token on Institute B", async () => {
  const token = createTenantAccessToken(user, instituteA);

  const context = makeTenantRequest({
    token,
    institute: instituteB,
  });

  const result = await runMiddleware(context.req);

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
  assert.equal(context.databaseLookups, 0);
  assert.equal(
    result.res.body.code,
    "TENANT_TOKEN_MISMATCH"
  );
});

test("tenant middleware accepts a valid token on its own institute", async () => {
  const token = createTenantAccessToken(user, instituteA);

  const context = makeTenantRequest({
    token,
    institute: instituteA,
  });

  const result = await runMiddleware(context.req);

  assert.equal(result.res.statusCode, 200);
  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, null);
  assert.equal(context.databaseLookups, 1);
//   assert.equal(context.req.tenantUser, undefined);
  assert.equal(context.req.tenantUser, user);
});

test("tenant middleware rejects a changed account role", async () => {
  const token = createTenantAccessToken(user, instituteA);

  const changedAccount = {
    ...user,
    role: "staff",
  };

  const context = makeTenantRequest({
    token,
    institute: instituteA,
    account: changedAccount,
  });

  const result = await runMiddleware(context.req);

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
  assert.equal(
    result.res.body.code,
    "TENANT_ROLE_CHANGED"
  );
});

test("tenant middleware rejects suspended accounts", async () => {
  const token = createTenantAccessToken(user, instituteA);

  const suspendedAccount = {
    ...user,
    status: "suspended",
  };

  const context = makeTenantRequest({
    token,
    institute: instituteA,
    account: suspendedAccount,
  });

  const result = await runMiddleware(context.req);

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalled, false);
  assert.equal(
    result.res.body.code,
    "TENANT_USER_SUSPENDED"
  );
});
