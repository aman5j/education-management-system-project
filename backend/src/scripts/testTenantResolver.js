
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import { test } from "node:test";

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
  domain = "",
  domainVerified = false,
  collectionPrefix,
}) => ({
  _id: id,
  name: `Institute ${slug}`,
  slug,
  status,
  provisioningStatus,
  domain,
  domainVerified,
  collectionPrefix:
    collectionPrefix || `inst_${id}`,
  tenantSchemaVersion: 1,
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
  cacheTtlMs = 0,
  findInstitutes,
}) => {
  invalidateTenantResolutionCache();

  let capturedFilter;

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs,

    findInstitutes: async (filter) => {
      capturedFilter = filter;

      if (findInstitutes) {
        return findInstitutes(filter);
      }

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
    filter: null,
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

// --------------------------------------------------
// HOSTNAME NORMALIZATION
// --------------------------------------------------

test("normalizes hostname to lowercase", () => {
  assert.equal(
    normalizeHostname("INSTITUTE-A.EMS.TEST"),
    "institute-a.ems.test"
  );
});

test("normalizes hostname and removes valid port", () => {
  assert.equal(
    normalizeHostname("INSTITUTE-A.EMS.TEST:5000"),
    "institute-a.ems.test"
  );
});

test("normalizes hostname with trailing root dot", () => {
  assert.equal(
    normalizeHostname("institute-a.ems.test."),
    "institute-a.ems.test"
  );
});

test("rejects malformed hostname", () => {
  assert.throws(
    () => normalizeHostname("https://evil.com/path"),
    /INVALID_HOSTNAME/
  );
});

test("rejects invalid port", () => {
  assert.throws(
    () => normalizeHostname("institute-a.ems.test:99999"),
    /INVALID_HOSTNAME/
  );
});

test("rejects hostname containing invalid characters", () => {
  assert.throws(
    () => normalizeHostname("institute a.ems.test"),
    /INVALID_HOSTNAME/
  );
});

// --------------------------------------------------
// INSTITUTE RESOLUTION
// --------------------------------------------------

test("unknown host is rejected", async () => {
  const result = await invokeResolver({
    hostname: "unknown.ems.test",
    records: [],
  });

  assert.equal(result.status, 404);
  assert.equal(
    result.body.code,
    "TENANT_NOT_FOUND"
  );
  assert.equal(result.nextCalled, false);
});

test("valid Institute A hostname resolves only Institute A", async () => {
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

  assert.equal(
    Object.isFrozen(result.req.tenant),
    true
  );
});

test("valid Institute B hostname resolves only Institute B", async () => {
  const result = await invokeResolver({
    hostname: "institute-b.ems.test",
    records: [instituteB],
  });

  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);

  assert.equal(
    result.req.tenantContext.instituteId,
    instituteB._id
  );

  assert.notEqual(
    result.req.tenantContext.instituteId,
    instituteA._id
  );
});

test("platform subdomain lookup uses slug only", async () => {
  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [instituteA],
  });

  assert.deepEqual(result.filter, {
    slug: "institute-a",
  });
});

test("custom domain lookup uses exact domain only", async () => {
  const customInstitute = createInstitute({
    id: "cccccccccccccccccccccccc",
    slug: "custom-institute",
    domain: "portal.custom-institute.test",
    domainVerified: true,
  });

  const result = await invokeResolver({
    hostname: "portal.custom-institute.test",
    records: [customInstitute],
  });

  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);

  assert.deepEqual(result.filter, {
    domain: "portal.custom-institute.test",
  });
});

test("verified custom domain resolves successfully", async () => {
  const customInstitute = createInstitute({
    id: "cccccccccccccccccccccccc",
    slug: "custom-institute",
    domain: "portal.custom-institute.test",
    domainVerified: true,
  });

  const result = await invokeResolver({
    hostname: "portal.custom-institute.test",
    records: [customInstitute],
  });

  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);
});

test("unverified custom domain is rejected", async () => {
  const customInstitute = createInstitute({
    id: "cccccccccccccccccccccccc",
    slug: "custom-institute",
    domain: "portal.custom-institute.test",
    domainVerified: false,
  });

  const result = await invokeResolver({
    hostname: "portal.custom-institute.test",
    records: [customInstitute],
  });

  assert.equal(result.status, 403);
  assert.equal(
    result.body.code,
    "TENANT_DOMAIN_UNVERIFIED"
  );
  assert.equal(result.nextCalled, false);
});

test("custom domain cannot claim a platform subdomain", async () => {
  const customInstitute = createInstitute({
    id: "cccccccccccccccccccccccc",
    slug: "another-institute",
    domain: "institute-a.ems.test",
    domainVerified: true,
  });

  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [customInstitute],
  });

  assert.deepEqual(result.filter, {
    slug: "institute-a",
  });

  assert.equal(result.status, 404);
  assert.equal(result.nextCalled, false);
});

// --------------------------------------------------
// DUPLICATE AND INVALID REGISTRY RECORDS
// --------------------------------------------------

test("duplicate hostname records are rejected", async () => {
  const duplicate = {
    ...instituteA,
    _id: "cccccccccccccccccccccccc",
    collectionPrefix:
      "inst_cccccccccccccccccccccccc",
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
  assert.equal(result.nextCalled, false);
});

test("invalid stored collection prefix fails closed", async () => {
  const invalidInstitute = {
    ...instituteA,
    collectionPrefix: "inst_wrong_prefix",
  };

  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [invalidInstitute],
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_REGISTRY_UNAVAILABLE"
  );
  assert.equal(result.nextCalled, false);
});

test("invalid institute ID fails closed", async () => {
  const invalidInstitute = {
    ...instituteA,
    _id: "invalid-id",
  };

  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    records: [invalidInstitute],
  });

  assert.equal(result.status, 503);
  assert.equal(result.nextCalled, false);
});

// --------------------------------------------------
// INSTITUTE STATUS
// --------------------------------------------------

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
  assert.equal(
    result.body.code,
    "TENANT_SUSPENDED"
  );
  assert.equal(result.nextCalled, false);
});

test("deactivated institute is rejected", async () => {
  const deactivated = createInstitute({
    id: "eeeeeeeeeeeeeeeeeeeeeeee",
    slug: "institute-e",
    status: "deactivated",
  });

  const result = await invokeResolver({
    hostname: "institute-e.ems.test",
    records: [deactivated],
  });

  assert.equal(result.status, 403);
  assert.equal(
    result.body.code,
    "TENANT_DEACTIVATED"
  );
  assert.equal(result.nextCalled, false);
});

test("unknown institute status is rejected", async () => {
  const inactive = createInstitute({
    id: "ffffffffffffffffffffffff",
    slug: "institute-f",
    status: "onboarding",
  });

  const result = await invokeResolver({
    hostname: "institute-f.ems.test",
    records: [inactive],
  });

  assert.equal(result.status, 403);
  assert.equal(
    result.body.code,
    "TENANT_INACTIVE"
  );
  assert.equal(result.nextCalled, false);
});

// --------------------------------------------------
// PROVISIONING STATUS
// --------------------------------------------------

test("pending provisioning is rejected", async () => {
  const pending = createInstitute({
    id: "111111111111111111111111",
    slug: "institute-pending",
    provisioningStatus: "pending",
  });

  const result = await invokeResolver({
    hostname: "institute-pending.ems.test",
    records: [pending],
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_PROVISIONING_PENDING"
  );
  assert.equal(result.nextCalled, false);
});

test("failed provisioning is rejected", async () => {
  const failed = createInstitute({
    id: "222222222222222222222222",
    slug: "institute-failed",
    provisioningStatus: "failed",
  });

  const result = await invokeResolver({
    hostname: "institute-failed.ems.test",
    records: [failed],
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_PROVISIONING_FAILED"
  );
  assert.equal(result.nextCalled, false);
});

test("unknown provisioning status is rejected", async () => {
  const invalid = createInstitute({
    id: "333333333333333333333333",
    slug: "institute-invalid",
    provisioningStatus: "unknown",
  });

  const result = await invokeResolver({
    hostname: "institute-invalid.ems.test",
    records: [invalid],
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_NOT_READY"
  );
  assert.equal(result.nextCalled, false);
});

// --------------------------------------------------
// PLATFORM RESERVED HOSTS
// --------------------------------------------------

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

test("platform API host is reserved", async () => {
  const result = await invokeResolver({
    hostname: "api.ems.test",
    records: [instituteA],
  });

  assert.equal(result.status, 404);
  assert.equal(
    result.body.code,
    "PLATFORM_HOST_RESERVED"
  );
});

test("nested platform subdomain is rejected", async () => {
  const result = await invokeResolver({
    hostname: "one.two.ems.test",
    records: [instituteA],
  });

  assert.equal(result.status, 404);
  assert.equal(
    result.body.code,
    "PLATFORM_HOST_RESERVED"
  );
});

// --------------------------------------------------
// SPOOFING AND TENANT ISOLATION
// --------------------------------------------------

test("forwarded host cannot override Express hostname", async () => {
  const result = await invokeResolver({
    hostname: "institute-a.ems.test",
    forwardedHost: "institute-b.ems.test",

    body: {
      instituteId: instituteB._id,
      collectionPrefix: instituteB.collectionPrefix,
      databaseName: "attacker_database",
    },

    headers: {
      "x-tenant-id": instituteB._id,
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

test("resolver replaces preexisting untrusted tenant context", async () => {
  invalidateTenantResolutionCache();

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 0,
    findInstitutes: async () => [instituteA],
  });

  const req = {
    hostname: "institute-a.ems.test",
    tenant: { id: instituteB._id },
    tenantContext: {
      instituteId: instituteB._id,
      collectionPrefix: instituteB.collectionPrefix,
    },
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

  assert.equal(result.nextCalled, true);

  assert.equal(
    req.tenantContext.instituteId,
    instituteA._id
  );
});

// --------------------------------------------------
// REAL EXPRESS FORWARDED-HOST TEST
// --------------------------------------------------

test("untrusted X-Forwarded-Host cannot override the actual Host header", async () => {
  invalidateTenantResolutionCache();

  const app = express();

  // Simulate a request that does not arrive through
  // a configured trusted reverse proxy.
  app.set("trust proxy", false);

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 0,

    findInstitutes: async (filter) => {
      if (filter.slug === "institute-a") {
        return [instituteA];
      }

      if (filter.slug === "institute-b") {
        return [instituteB];
      }

      return [];
    },
  });

  app.use(middleware);

  app.use((req, res) => {
    res.json({
      instituteId: req.tenantContext.instituteId,
      hostname: req.tenantContext.hostname,
    });
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    const address = server.address();

    const response = await new Promise((resolve, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port: address.port,
          path: "/",
          method: "GET",
          headers: {
            Host: "institute-a.ems.test",
            "X-Forwarded-Host": "institute-b.ems.test",
          },
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data),
            });
          });
        }
      );

      request.on("error", reject);
      request.end();
    });

    assert.equal(response.status, 200);

    assert.equal(
      response.body.instituteId,
      instituteA._id
    );

    assert.equal(
      response.body.hostname,
      "institute-a.ems.test"
    );
  } finally {
     if (server.listening) {
        await new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
        });
    }
  }
});

// --------------------------------------------------
// CACHE INVALIDATION
// --------------------------------------------------

test("cache reuses a valid resolution", async () => {
  invalidateTenantResolutionCache();

  let lookupCount = 0;

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 10000,

    findInstitutes: async () => {
      lookupCount += 1;
      return [instituteA];
    },
  });

  const invoke = async () => {
    const req = {
      hostname: "institute-a.ems.test",
      headers: {},
    };

    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };

    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  };

  await invoke();
  await invoke();

  assert.equal(lookupCount, 1);
});

test("cache invalidation forces a fresh registry lookup", async () => {
  invalidateTenantResolutionCache();

  let lookupCount = 0;

  const middleware = createTenantResolver({
    baseDomain: BASE_DOMAIN,
    cacheTtlMs: 10000,

    findInstitutes: async () => {
      lookupCount += 1;
      return [instituteA];
    },
  });

  const invoke = async () => {
    const req = {
      hostname: "institute-a.ems.test",
      headers: {},
    };

    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };

    await middleware(req, res, () => {});
  };

  await invoke();

  invalidateTenantResolutionCache();

  await invoke();

  assert.equal(lookupCount, 2);
});

// --------------------------------------------------
// DATABASE FAILURE
// --------------------------------------------------

test("registry failure fails closed", async () => {
  const result = await invokeResolver({
    hostname: "institute-a.ems.test",

    findInstitutes: async () => {
      throw new Error("Database unavailable");
    },
  });

  assert.equal(result.status, 503);
  assert.equal(
    result.body.code,
    "TENANT_REGISTRY_UNAVAILABLE"
  );
  assert.equal(result.nextCalled, false);
});
