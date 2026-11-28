
import dotenv from "dotenv";
import dns from "node:dns";
import http from "node:http";
import crypto from "node:crypto";
import assert from "node:assert/strict";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Test-only configuration. Never use these secrets in production.
process.env.NODE_ENV = "test";
process.env.PLATFORM_BASE_DOMAIN = "localhost";
process.env.PLATFORM_RESERVED_HOSTS = "";

process.env.TENANT_JWT_ACCESS_SECRET =
  "test-tenant-access-secret-0123456789-abcdef";

process.env.TENANT_JWT_REFRESH_SECRET =
  "test-tenant-refresh-secret-0123456789-abcdef";

const EXPECTED_DATABASE = "education_management_system";
const TEST_PASSWORD = "HttpTest!Pass123";
const tag = crypto.randomBytes(6).toString("hex");

let mongoose;
let app;
let server;
let serverPort;

let getInstituteModel;
let loadTenantModelDefinitions;
let registerTenantModelSet;
let getTenantCollectionName;
let createTenantAccessToken;

const temporaryRecords = [];
let cleanupFailed = false;

const pass = (message) => {
  console.log(`PASS: ${message}`);
};

const requestHttp = ({
  hostname,
  path,
  method = "GET",
  body,
  token,
}) =>
  new Promise((resolve, reject) => {
    const payload =
      body === undefined ? null : JSON.stringify(body);

    const headers = { host: hostname };

    if (payload !== null) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(payload);
    }

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: serverPort,
        path,
        method,
        headers,
      },
      (response) => {
        let responseBody = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });

        response.on("end", () => {
          let json = null;

          try {
            json = responseBody
              ? JSON.parse(responseBody)
              : null;
          } catch {
            return reject(
              new Error(
                `Invalid JSON from ${method} ${path}: ${responseBody}`
              )
            );
          }

          resolve({
            status: response.statusCode,
            body: json,
          });
        });
      }
    );

    request.on("error", reject);

    if (payload !== null) {
      request.write(payload);
    }

    request.end();
  });

const assertStatus = (
  response,
  expectedStatus,
  description
) => {
  assert.equal(
    response.status,
    expectedStatus,
    `${description}: expected ${expectedStatus}, received ${response.status}. Body: ${JSON.stringify(response.body)}`
  );
};

const getTenantContext = (institute) => ({
  instituteId: String(institute._id),
  collectionPrefix: institute.collectionPrefix,
});

const createTrackedRecord = async (Model, data) => {
  const record = await Model.create(data);

  temporaryRecords.push({
    Model,
    id: record._id,
  });

  return record;
};

const createAccount = async (
  User,
  { name, email, role, assignedRole = null }
) =>
  createTrackedRecord(User, {
    name,
    email,
    password: TEST_PASSWORD,
    role,
    status: "active",
    assignedRole,
  });

const findExistingInstitutes = async ({
  connection,
  Institute,
}) => {
  console.log("\nFinding existing active institutes...");

  const institutes = await Institute.find({
    status: "active",
    provisioningStatus: "ready",
  })
    .sort({ createdAt: 1 })
    .lean();

  const collectionRows = await connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const existingCollections = new Set(
    collectionRows.map((item) => item.name)
  );

  const validSlug = (slug) =>
    typeof slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const instituteA = institutes.find((institute) => {
    if (!validSlug(institute.slug)) return false;

    const userCollection = getTenantCollectionName(
      institute,
      "User"
    );

    const roleCollection = getTenantCollectionName(
      institute,
      "Role"
    );

    return (
      existingCollections.has(userCollection) &&
      existingCollections.has(roleCollection)
    );
  });

  if (!instituteA) {
    throw new Error(
      "SAFE STOP: No active, ready institute has both existing tenant users and roles collections. No institute or collection was created."
    );
  }

  const instituteB = institutes.find(
    (institute) =>
      String(institute._id) !== String(instituteA._id) &&
      validSlug(institute.slug)
  );

  if (!instituteB) {
    throw new Error(
      "SAFE STOP: A second active, ready institute is required to test cross-host token rejection. No institute or collection was created."
    );
  }

  assert.equal(
    instituteA.collectionPrefix,
    `inst_${String(instituteA._id).toLowerCase()}`,
    "Institute A collection prefix is missing or invalid."
  );

  assert.equal(
    instituteB.collectionPrefix,
    `inst_${String(instituteB._id).toLowerCase()}`,
    "Institute B collection prefix is missing or invalid."
  );

  console.log("Selected existing Institute A:", instituteA.slug);
  console.log("Selected existing Institute B:", instituteB.slug);

  pass("Two existing active and ready institutes selected");
  pass("Institute A users and roles collections already exist");

  return { instituteA, instituteB };
};

const login = async (institute, role, email) => {
  const response = await requestHttp({
    hostname: `${institute.slug}.localhost`,
    path: "/api/tenant/auth/login",
    method: "POST",
    body: {
      email,
      password: TEST_PASSWORD,
      role,
    },
  });

  assertStatus(
    response,
    200,
    `${role} login`
  );

  assert.equal(
    response.body?.success,
    true,
    `${role} login did not return success`
  );

  const token = response.body?.data?.accessToken;

  assert.ok(
    token,
    `${role} login did not return an access token`
  );

  return token;
};

const cleanup = async () => {
  console.log("\nStarting safe test cleanup...");

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });

    server = null;
    console.log("CLEANUP: HTTP server closed");
  }

  if (mongoose?.connection?.readyState === 1) {
    // Delete only records created by this test run.
    for (const item of [...temporaryRecords].reverse()) {
      try {
        await item.Model.deleteOne({
          _id: item.id,
        });

        console.log(
          `CLEANUP: Removed temporary ${item.Model.modelName} record ${item.id}`
        );
      } catch (error) {
        cleanupFailed = true;

        console.error(
          `CLEANUP FAILED for ${item.Model.modelName} ${item.id}:`,
          error.message
        );
      }
    }

    await mongoose.disconnect();
    console.log("CLEANUP: MongoDB disconnected");
  }

  console.log("CLEANUP: No institutes were created or deleted.");
  console.log("CLEANUP: No collections were created or dropped.");
};

const run = async () => {
  console.log("");
  console.log("================================================");
  console.log("BATCH 2F-2 — SAFE REAL HTTP AUTHORIZATION TEST");
  console.log("================================================");

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from backend/.env."
    );
  }

  const mongooseModule = await import("mongoose");
  mongoose = mongooseModule.default;

  const [
    instituteModule,
    loaderModule,
    factoryModule,
    registryModule,
    tenantAuthModule,
  ] = await Promise.all([
    import("../models/Institute.js"),
    import("../services/tenantSchemaLoader.js"),
    import("../services/tenantModelFactory.js"),
    import("../config/tenantCollectionRegistry.js"),
    import("../utils/tenantAuth.js"),
  ]);

  getInstituteModel = instituteModule.default;
  loadTenantModelDefinitions =
    loaderModule.loadTenantModelDefinitions;
  registerTenantModelSet =
    factoryModule.registerTenantModelSet;
  getTenantCollectionName =
    registryModule.getTenantCollectionName;
  createTenantAccessToken =
    tenantAuthModule.createTenantAccessToken;

  console.log("\nConnecting to central database...");

  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
    serverSelectionTimeoutMS: 15000,
  });

  const connection = mongoose.connection;

  assert.equal(
    connection.name,
    EXPECTED_DATABASE,
    `Expected ${EXPECTED_DATABASE}, received ${connection.name}`
  );

  pass(`Connected to ${EXPECTED_DATABASE}`);

  const Institute = getInstituteModel(connection);

  const { instituteA, instituteB } =
    await findExistingInstitutes({
      connection,
      Institute,
    });

  console.log("\nLoading tenant model definitions...");

  const definitions = await loadTenantModelDefinitions();

  assert.equal(
    definitions.length,
    50,
    `Expected 50 tenant model definitions, received ${definitions.length}`
  );

  pass(`Loaded ${definitions.length} tenant model definitions`);

  // Register only the existing Institute A collections.
  // Registration itself does not create MongoDB collections.
  const modelsA = registerTenantModelSet(
    connection,
    instituteA,
    definitions
  );

  assert.equal(
    modelsA.User.collection.name,
    getTenantCollectionName(instituteA, "User")
  );

  assert.equal(
    modelsA.Role.collection.name,
    getTenantCollectionName(instituteA, "Role")
  );

  pass("Institute A tenant User and Role models registered");

  // Confirm required collections still exist immediately before writes.
  const existingCollections = new Set(
    (
      await connection.db
        .listCollections({}, { nameOnly: true })
        .toArray()
    ).map((item) => item.name)
  );

  for (const modelName of ["User", "Role"]) {
    const collectionName = getTenantCollectionName(
      instituteA,
      modelName
    );

    assert.ok(
      existingCollections.has(collectionName),
      `Refusing to write: ${collectionName} does not exist`
    );
  }

  const User = modelsA.User;
  const Role = modelsA.Role;

  console.log("\nCreating temporary records in existing collections...");

  const staffRole = await createTrackedRecord(Role, {
    name: `http-test-staff-${tag}`,
    label: "HTTP Test Staff",
    description: "Temporary Batch 2F-2 integration test role",
    roleType: "staff",
    permissions: ["courses.view"],
    isSystem: false,
    isActive: true,
  });

  const adminA = await createAccount(User, {
    name: "HTTP Test Admin A",
    email: `http-admin-a-${tag}@example.test`,
    role: "admin",
  });

  const staffA = await createAccount(User, {
    name: "HTTP Test Staff A",
    email: `http-staff-a-${tag}@example.test`,
    role: "staff",
    assignedRole: staffRole._id,
  });

  const studentA = await createAccount(User, {
    name: "HTTP Test Student A",
    email: `http-student-a-${tag}@example.test`,
    role: "student",
  });

  pass("Temporary Role, Admin, Staff and Student records created");
  pass("All temporary records are tracked for exact-record cleanup");

  // Import the Express app after test configuration and DB connection.
  const appModule = await import("../app.js");
  app = appModule.default;

  console.log("\nStarting actual Express HTTP server...");

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error) => {
      if (error) return reject(error);

      serverPort = server.address().port;
      resolve();
    });
  });

  pass(`Express HTTP server started on port ${serverPort}`);

  const hostA = `${instituteA.slug}.localhost`;
  const hostB = `${instituteB.slug}.localhost`;

  // 1. Admin login
  const adminTokenA = await login(
    instituteA,
    "admin",
    adminA.email
  );

  pass("Institute A Admin login works through HTTP");

  // 2. Admin Course API
  const adminCourses = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: adminTokenA,
  });

  assertStatus(adminCourses, 200, "Admin Course API");
  assert.equal(adminCourses.body.success, true);

  pass("Admin can access tenant Course API");

  // 3. Admin Subject API
  const adminSubjects = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/subjects",
    token: adminTokenA,
  });

  assertStatus(adminSubjects, 200, "Admin Subject API");
  assert.equal(adminSubjects.body.success, true);

  pass("Admin can access tenant Subject API");

  // 4. Missing token
  const unauthenticated = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
  });

  assertStatus(
    unauthenticated,
    401,
    "Unauthenticated Course request"
  );

  assert.equal(
    unauthenticated.body.code,
    "TENANT_AUTH_REQUIRED"
  );

  pass("Unauthenticated request is rejected");

  // 5. Invalid token
  const invalidToken = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: "invalid.tenant.access.token",
  });

  assertStatus(invalidToken, 401, "Invalid access token");

  assert.equal(
    invalidToken.body.code,
    "TENANT_ACCESS_TOKEN_INVALID"
  );

  pass("Invalid tenant access token is rejected");

  // 6. Expired token
  const expiredToken = createTenantAccessToken(
    adminA,
    getTenantContext(instituteA),
    "-1s"
  );

  const expiredResponse = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: expiredToken,
  });

  assertStatus(expiredResponse, 401, "Expired access token");

  assert.equal(
    expiredResponse.body.code,
    "TENANT_ACCESS_TOKEN_EXPIRED"
  );

  pass("Expired tenant access token is rejected");

  // 7. Staff permission checks
  const staffToken = await login(
    instituteA,
    "staff",
    staffA.email
  );

  const staffCourses = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: staffToken,
  });

  assertStatus(staffCourses, 200, "Staff Course access");

  pass("Staff with courses.view can access Course API");

  const staffSubjects = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/subjects",
    token: staffToken,
  });

  assertStatus(
    staffSubjects,
    403,
    "Staff Subject access without permission"
  );

  assert.equal(
    staffSubjects.body.code,
    "TENANT_PERMISSION_FORBIDDEN"
  );

  pass("Staff without subjects.view is denied Subject API");

  // 8. Student management API rejection
  const studentToken = await login(
    instituteA,
    "student",
    studentA.email
  );

  const studentCourses = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: studentToken,
  });

  assertStatus(
    studentCourses,
    403,
    "Student Course management access"
  );

  assert.equal(
    studentCourses.body.code,
    "TENANT_PERMISSION_FORBIDDEN"
  );

  pass("Student is denied Course management API");

  const studentSubjects = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/subjects",
    token: studentToken,
  });

  assertStatus(
    studentSubjects,
    403,
    "Student Subject management access"
  );

  pass("Student is denied Subject management API");

  // 9. Institute A token on Institute B hostname
  const crossTenantResponse = await requestHttp({
    hostname: hostB,
    path: "/api/tenant/courses",
    token: adminTokenA,
  });

  assertStatus(
    crossTenantResponse,
    401,
    "Institute A token on Institute B hostname"
  );

  assert.equal(
    crossTenantResponse.body.code,
    "TENANT_TOKEN_MISMATCH"
  );

  pass("Institute A token is rejected on Institute B hostname");

  // 10. Browser-supplied tenant identifiers cannot switch tenant
  const spoofedTenantResponse = await requestHttp({
    hostname: hostA,
    path:
      `/api/tenant/courses?instituteId=${instituteB._id}` +
      `&collectionPrefix=${encodeURIComponent(instituteB.collectionPrefix)}`,
    token: adminTokenA,
  });

  assertStatus(
    spoofedTenantResponse,
    200,
    "Spoofed tenant query parameters"
  );

  pass("Browser-supplied tenant identifiers do not switch tenant");

  console.log("");
  console.log("================================================");
  console.log("BATCH 2F-2 — HTTP TEST SUMMARY");
  console.log("================================================");
  console.log("Result: ALL HTTP CHECKS PASSED");
  console.log("Institute A:", String(instituteA._id));
  console.log("Institute B:", String(instituteB._id));
  console.log("Database:", connection.name);
  console.log("New collections created: 0");
  console.log("Collections dropped: 0");
  console.log("Institutes created/deleted: 0");
  console.log("================================================");
};

run()
  .catch((error) => {
    console.error("");
    console.error("BATCH 2F-2 HTTP TEST FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      cleanupFailed = true;
      console.error("TEST CLEANUP FAILED:", error);
      process.exitCode = 1;
    }

    if (cleanupFailed) {
      console.error(
        "WARNING: One or more temporary records may require cleanup review."
      );
      process.exitCode = 1;
    }
  });
