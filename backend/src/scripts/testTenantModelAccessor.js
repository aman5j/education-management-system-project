
import test from "node:test";
import assert from "node:assert/strict";

import {
  createTenantModelAccessor,
} from "../services/tenantModelAccessor.js";

const instituteA = Object.freeze({
  instituteId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  collectionPrefix: "inst_aaaaaaaaaaaaaaaaaaaaaaaa",
});

const instituteB = Object.freeze({
  instituteId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  collectionPrefix: "inst_bbbbbbbbbbbbbbbbbbbbbbbb",
});

const makeModel = (modelName, institute) => ({
  modelName: `${modelName}__${institute.collectionPrefix}`,
  collection: {
    name: `${institute.collectionPrefix}_${modelName
      .replace(/[A-Z]/g, (letter, index) =>
        `${index ? "" : ""}${letter.toLowerCase()}`
      )}`,
  },
});

// Use the exact collection names from the server registry.
const makeRegisteredModel = (modelName, institute, collection) => ({
  modelName: `${modelName}__${institute.collectionPrefix}`,
  collection: { name: collection },
});

const userA = makeRegisteredModel(
  "User",
  instituteA,
  "inst_aaaaaaaaaaaaaaaaaaaaaaaa_users"
);

const userB = makeRegisteredModel(
  "User",
  instituteB,
  "inst_bbbbbbbbbbbbbbbbbbbbbbbb_users"
);

const courseA = makeRegisteredModel(
  "Course",
  instituteA,
  "inst_aaaaaaaaaaaaaaaaaaaaaaaa_courses"
);

const makeRequest = (context = instituteA) => ({
  tenantContext: Object.freeze({
    instituteId: context.instituteId,
    collectionPrefix: context.collectionPrefix,
  }),
});

test("returns the registered model for the current institute", () => {
  const req = makeRequest(instituteA);
  const accessor = createTenantModelAccessor(req, {
    User: userA,
    Course: courseA,
  });

  assert.equal(accessor("User"), userA);
  assert.equal(accessor("Course"), courseA);
});

test("does not return another institute's model", () => {
  const req = makeRequest(instituteA);
  const accessor = createTenantModelAccessor(req, {
    User: userB,
  });

  assert.throws(
    () => accessor("User"),
    /TENANT_MODEL_BOUNDARY_VIOLATION/
  );
});

test("rejects model names not in the tenant registry", () => {
  const req = makeRequest(instituteA);
  const accessor = createTenantModelAccessor(req, {
    User: userA,
  });

  assert.throws(
    () => accessor("Institute"),
    /TENANT_MODEL_NOT_REGISTERED/
  );

  assert.throws(
    () => accessor("PlatformUser"),
    /TENANT_MODEL_NOT_REGISTERED/
  );
});

test("rejects a model missing from the registered model set", () => {
  const req = makeRequest(instituteA);
  const accessor = createTenantModelAccessor(req, {});

  assert.throws(
    () => accessor("User"),
    /TENANT_MODEL_NOT_AVAILABLE/
  );
});

test("rejects a model with the wrong collection", () => {
  const req = makeRequest(instituteA);

  const wrongCollectionModel = makeRegisteredModel(
    "User",
    instituteA,
    "inst_bbbbbbbbbbbbbbbbbbbbbbbb_users"
  );

  const accessor = createTenantModelAccessor(req, {
    User: wrongCollectionModel,
  });

  assert.throws(
    () => accessor("User"),
    /TENANT_MODEL_BOUNDARY_VIOLATION/
  );
});

test("rejects a model with the wrong internal model name", () => {
  const req = makeRequest(instituteA);

  const wrongModelName = {
    modelName: "User__inst_bbbbbbbbbbbbbbbbbbbbbbbb",
    collection: {
      name: "inst_aaaaaaaaaaaaaaaaaaaaaaaa_users",
    },
  };

  const accessor = createTenantModelAccessor(req, {
    User: wrongModelName,
  });

  assert.throws(
    () => accessor("User"),
    /TENANT_MODEL_BOUNDARY_VIOLATION/
  );
});

test("rejects a request whose tenant context changes", () => {
  const req = makeRequest(instituteA);
  const accessor = createTenantModelAccessor(req, {
    User: userA,
  });

  req.tenantContext = instituteB;

  assert.throws(
    () => accessor("User"),
    /TENANT_CONTEXT_CHANGED/
  );
});

test("rejects missing tenant context", () => {
  assert.throws(
    () => createTenantModelAccessor({}, {
      User: userA,
    }),
    /TENANT_CONTEXT_MISSING/
  );
});

test("rejects a missing registered model set", () => {
  const req = makeRequest(instituteA);

  assert.throws(
    () => createTenantModelAccessor(req, null),
    /TENANT_MODEL_SET_MISSING/
  );
});
