
import assert from "node:assert/strict";
import {
  test,
} from "node:test";

import {
  createTenantResolver,
  normalizeHostname,
  invalidateTenantResolutionCache,
} from "../middleware/tenantResolver.middleware.js";

const BASE_DOMAIN = "ems.test";

const createInstitute = ({
  id,
  slug,
  status = "active",
  provisioningStatus = "ready",
}) => ({
  _id: id,
  name: `Institute ${slug}`,
  slug,
  status,
  provisioningStatus,
  collectionPrefix: `inst_${id}`,
});

const instituteA = createInstitute({
  id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  slug: "institute-a",
});

const instituteB = createInstitute({
  id: "bbbbbbbbbbbbbbbbbbbbbbbb",
  slug: "institute-b",
});

const invokeResolver = async ({
  hostname,
  forwardedHost,
  body = {},
  headers = {},
  records = [],
}) => {
  invalidateTenantResolutionCache();

  let capturedFilter;

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 0,

    findInstitutes: async (filter) => {
      capturedFilter = filter;

      return records;
    },
  });

  const req = {
    hostname,
    body,
    headers: {
      ...headers,
      ...(forwardedHost
        ? { "x-forwarded-host": forwardedHost }
        : {}),
    },
  };

  const result = {
    status: 200,
    body: null,
    nextCalled: false,
    req,
  };

  const res = {
    status(code) {
      result.status = code;
      return this;
    },

    json(payload) {
      result.body = payload;
      return this;
    },
  };

  await middleware(req, res, () => {
    result.nextCalled = true;
  });

  result.filter = capturedFilter;

  return result;
};

test("normalizes hostname and removes port", () => {
  assert.equal(
    normalizeHostname("INSTITUTE-A.EMS.TEST:5000"),
    "institute-a.ems.test"
  );
});

test("rejects malformed hostname", () => {
  assert.throws(
    () => normalizeHostname("https://evil.com/path"),
    /INVALID_HOSTNAME/
  );
});

test("unknown host is rejected", async () => {
  const result = await invokeResolver({
    hostname: "unknown.ems.test",
    records: [],
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.code, "TENANT_NOT_FOUND");
  assert.equal(result.nextCalled, false);
});

test("forwarded-host cannot override Express hostname", async () => {
  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    forwardedHost: "institute-b.ems.test",
    body: {
      instituteId: instituteB._id,
      collectionPrefix: instituteB.collectionPrefix,
      databaseName: "attacker_database",
    },
    records: [instituteA],
  });

  assert.equal(result.nextCalled, true);
  assert.equal(
    result.req.tenantContext.instituteId,
    instituteA._id
  );

  assert.equal(
    result.req.tenantContext.collectionPrefix,
    instituteA.collectionPrefix
  );
});

test("duplicate hostname records are rejected", async () => {
  const duplicate = {
    ...instituteA,
    _id: "cccccccccccccccccccccccc",
    collectionPrefix: "inst_cccccccccccccccccccccccc",
  };

  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [instituteA, duplicate],
  });

  assert.equal(result.status, 409);
  assert.equal(
    result.body.code,
    "TENANT_DOMAIN_CONFLICT"
  );
});

test("suspended institute is rejected", async () => {
  const suspended = createInstitute({
    id: "dddddddddddddddddddddddd",
    slug: "institute-d",
    status: "suspended",
  });

  const result = await invokeResolver({
    hostname: "institute-d.ems.test",
    records: [suspended],
  });

  assert.equal(result.status, 403);
  assert.equal(result.body.code, "TENANT_SUSPENDED");
});

test("valid hostname resolves only its own institute", async () => {
  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [instituteA],
  });

  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);

  assert.equal(
    result.req.tenantContext.instituteId,
    instituteA._id
  );

  assert.equal(
    result.req.tenantContext.collectionPrefix,
    instituteA.collectionPrefix
  );

  assert.equal(
    Object.isFrozen(result.req.tenantContext),
    true
  );
});

test("platform host is reserved", async () => {
  const result = await invokeResolver({
    hostname: "platform.ems.test",
    records: [instituteA],
  });

  assert.equal(result.status, 404);
  assert.equal(
    result.body.code,
    "PLATFORM_HOST_RESERVED"
  );
  assert.equal(result.nextCalled, false);
});

test("unverified custom domain is rejected", async () => {
  const customDomainInstitute = {
    ...instituteA,
    domain: "portal.institute-a.test",
    domainVerified: false,
  };

  const result = await invokeResolver({
    hostname: "portal.institute-a.test",
    records: [customDomainInstitute],
  });

  assert.equal(result.status, 403);
  assert.equal(
    result.body.code,
    "TENANT_DOMAIN_UNVERIFIED"
  );
});

test("registry failure fails closed", async () => {
  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 0,

    findInstitutes: async () => {
      throw new Error("Database unavailable");
    },
  });

  const req = {
    hostname: "institute-a.ems.test",
    body: {},
    headers: {},
  };

  const result = {
    status: 200,
    body: null,
    nextCalled: false,
  };

  const res = {
    status(code) {
      result.status = code;
      return this;
    },

    json(payload) {
      result.body = payload;
      return this;
    },
  };

  await middleware(req, res, () => {
    result.nextCalled = true;
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_REGISTRY_UNAVAILABLE"
  );
  assert.equal(result.nextCalled, false);
});
