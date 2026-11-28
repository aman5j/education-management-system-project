
import dotenv from "dotenv";
import dns from "node:dns";
import http from "node:http";
import crypto from "node:crypto";
import assert from "node:assert/strict";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Isolated test configuration. Never use these secrets in production.
process.env.NODE_ENV = "test";
process.env.PLATFORM_BASE_DOMAIN = "localhost";
process.env.PLATFORM_RESERVED_HOSTS = "";

process.env.TENANT_JWT_ACCESS_SECRET =
  "test-tenant-access-secret-0123456789-abcdef";

process.env.TENANT_JWT_REFRESH_SECRET =
  "test-tenant-refresh-secret-0123456789-abcdef";

const EXPECTED_DATABASE = "education_management_system";
const TEST_PASSWORD = "HttpTest!Pass123";

const TENANT_COLLECTIONS_TO_CLEAN = [
  "users",
  "roles",
  "courses",
  "subjects",
];

const tag = crypto.randomBytes(5).toString("hex");

let mongoose;
let app;
let getInstituteModel;
let loadTenantModelDefinitions;
let registerTenantModelSet;
let createTenantAccessToken;

let server;
let serverPort;

const institutes = [];
const tenantModelSets = [];

const pass = (message) => {
  console.log(`PASS: ${message}`);
};

const createInstitute = async (Institute, label) => {
  const slug = `ems-http-${label}-${tag}`;

  const institute = await Institute.create({
    name: `EMS HTTP Test ${label} ${tag}`,
    slug,
    contactEmail: `${slug}@example.test`,
    databaseName: `ems_http_test_${label}_${tag}`,
    status: "active",
    provisioningStatus: "ready",
    domain: "",
    domainVerified: false,
  });

  institutes.push(institute);

  return institute;
};

const getTenantContext = (institute) => ({
  instituteId: String(institute._id),
  collectionPrefix: institute.collectionPrefix,
});

const createAccount = async (
  models,
  {
    name,
    email,
    role,
    assignedRole = null,
  }
) => {
  return models.User.create({
    name,
    email,
    password: TEST_PASSWORD,
    role,
    status: "active",
    assignedRole,
  });
};

const requestHttp = ({
  hostname,
  path,
  method = "GET",
  body,
  token,
}) => {
  return new Promise((resolve, reject) => {
    const payload =
      body === undefined ? null : JSON.stringify(body);

    const headers = {
      host: hostname,
    };

    if (payload !== null) {
      headers["content-type"] = "application/json";
      headers["content-length"] =
        Buffer.byteLength(payload);
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

  assert.equal(
    response.status,
    200,
    `Login failed for ${role}: ${JSON.stringify(response.body)}`
  );

  assert.equal(response.body.success, true);

  const token = response.body?.data?.accessToken;

  assert.ok(token, `${role} login did not return an access token`);

  return token;
};

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

const dropTemporaryCollections = async (connection) => {
  for (const institute of institutes) {
    const prefix = institute.collectionPrefix;

    for (const collectionSuffix of TENANT_COLLECTIONS_TO_CLEAN) {
      const collectionName =
        `${prefix}_${collectionSuffix}`;

      try {
        await connection.db.dropCollection(collectionName);

        console.log(
          `CLEANUP: Dropped ${collectionName}`
        );
      } catch (error) {
        if (
          error.code !== 26 &&
          error.codeName !== "NamespaceNotFound"
        ) {
          console.error(
            `CLEANUP WARNING: ${collectionName}: ${error.message}`
          );
        }
      }
    }
  }
};

const cleanup = async () => {
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });

    server = null;
  }

  if (mongoose?.connection?.readyState === 1) {
    const Institute = getInstituteModel(
      mongoose.connection
    );

    if (institutes.length) {
      await Institute.deleteMany({
        _id: {
          $in: institutes.map((item) => item._id),
        },
      });
    }

    await dropTemporaryCollections(
      mongoose.connection
    );

    await mongoose.disconnect();
  }
};

const run = async () => {
  console.log("");
  console.log("==============================================");
  console.log("BATCH 2F-2 — REAL HTTP AUTHORIZATION TEST");
  console.log("==============================================");

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from backend/.env."
    );
  }

  // Import after test environment variables are configured.
  const mongooseModule = await import("mongoose");
  mongoose = mongooseModule.default;

  const [
    appModule,
    instituteModule,
    loaderModule,
    factoryModule,
    tenantAuthModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../models/Institute.js"),
    import("../services/tenantSchemaLoader.js"),
    import("../services/tenantModelFactory.js"),
    import("../utils/tenantAuth.js"),
  ]);

  app = appModule.default;
  getInstituteModel = instituteModule.default;
  loadTenantModelDefinitions =
    loaderModule.loadTenantModelDefinitions;
  registerTenantModelSet =
    factoryModule.registerTenantModelSet;
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

  console.log("\nLoading tenant model definitions...");

  const definitions = await loadTenantModelDefinitions();

  assert.equal(definitions.length, 50);

  pass(`Loaded ${definitions.length} tenant model definitions`);

  const Institute = getInstituteModel(connection);

  console.log("\nCreating temporary institutes...");

  const instituteA = await createInstitute(
    Institute,
    "a"
  );

  const instituteB = await createInstitute(
    Institute,
    "b"
  );

  const modelsA = registerTenantModelSet(
    connection,
    instituteA,
    definitions
  );

  const modelsB = registerTenantModelSet(
    connection,
    instituteB,
    definitions
  );

  tenantModelSets.push(modelsA, modelsB);

  assert.notEqual(
    modelsA.User.collection.name,
    modelsB.User.collection.name
  );

  assert.notEqual(
    modelsA.Course.collection.name,
    modelsB.Course.collection.name
  );

  pass("Both institutes have separate tenant collections");

  console.log("\nCreating temporary accounts...");

  const staffRole = await modelsA.Role.create({
    name: `http-test-staff-${tag}`,
    label: "HTTP Test Staff",
    description: "Temporary HTTP integration test role",
    roleType: "staff",
    permissions: ["courses.view"],
    isSystem: false,
    isActive: true,
  });

  const adminA = await createAccount(modelsA, {
    name: "HTTP Test Admin A",
    email: `admin-a-${tag}@example.test`,
    role: "admin",
  });

  const staffA = await createAccount(modelsA, {
    name: "HTTP Test Staff A",
    email: `staff-a-${tag}@example.test`,
    role: "staff",
    assignedRole: staffRole._id,
  });

  const studentA = await createAccount(modelsA, {
    name: "HTTP Test Student A",
    email: `student-a-${tag}@example.test`,
    role: "student",
  });

  await createAccount(modelsB, {
    name: "HTTP Test Admin B",
    email: `admin-b-${tag}@example.test`,
    role: "admin",
  });

  pass("Temporary Admin, Staff and Student accounts created");

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

  // ---------------------------------------------
  // 1. Real tenant Admin login
  // ---------------------------------------------

  const adminTokenA = await login(
    instituteA,
    "admin",
    adminA.email
  );

  pass("Institute A Admin login works through HTTP");

  // ---------------------------------------------
  // 2. Admin Course and Subject API access
  // ---------------------------------------------

  const adminCourses = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: adminTokenA,
  });

  assertStatus(
    adminCourses,
    200,
    "Admin Course API access"
  );

  assert.equal(adminCourses.body.success, true);

  pass("Admin can access tenant Course API");

  const adminSubjects = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/subjects",
    token: adminTokenA,
  });

  assertStatus(
    adminSubjects,
    200,
    "Admin Subject API access"
  );

  assert.equal(adminSubjects.body.success, true);

  pass("Admin can access tenant Subject API");

  // ---------------------------------------------
  // 3. Unauthenticated request rejection
  // ---------------------------------------------

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

  pass("Unauthenticated Course request is rejected");

  // ---------------------------------------------
  // 4. Invalid token rejection
  // ---------------------------------------------

  const invalidToken = await requestHttp({
    hostname: hostA,
    path: "/api/tenant/courses",
    token: "invalid.tenant.access.token",
  });

  assertStatus(
    invalidToken,
    401,
    "Invalid access token"
  );

  assert.equal(
    invalidToken.body.code,
    "TENANT_ACCESS_TOKEN_INVALID"
  );

  pass("Invalid tenant access token is rejected");

  // ---------------------------------------------
  // 5. Expired token rejection
  // ---------------------------------------------

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

  assertStatus(
    expiredResponse,
    401,
    "Expired access token"
  );

  assert.equal(
    expiredResponse.body.code,
    "TENANT_ACCESS_TOKEN_EXPIRED"
  );

  pass("Expired tenant access token is rejected");

  // ---------------------------------------------
  // 6. Staff permission-based authorization
  // ---------------------------------------------

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

  assertStatus(
    staffCourses,
    200,
    "Staff Course access"
  );

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

  // ---------------------------------------------
  // 7. Student cannot access management APIs
  // ---------------------------------------------

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

  // ---------------------------------------------
  // 8. Institute A token on Institute B hostname
  // ---------------------------------------------

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

  pass("Institute A access token is rejected on Institute B");

  // ---------------------------------------------
  // 9. Browser-supplied tenant identity is ignored
  // ---------------------------------------------

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
    "Request containing spoofed tenant query values"
  );

  pass("Browser-supplied tenant identifiers do not change resolved tenant");

  console.log("");
  console.log("==============================================");
  console.log("BATCH 2F-2 — HTTP TEST SUMMARY");
  console.log("==============================================");
  console.log("Result: ALL HTTP CHECKS PASSED");
  console.log("Institute A:", String(instituteA._id));
  console.log("Institute B:", String(instituteB._id));
  console.log("Database:", connection.name);
  console.log("==============================================");
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
      console.error("TEST CLEANUP FAILED:", error);
      process.exitCode = 1;
    }
  });
