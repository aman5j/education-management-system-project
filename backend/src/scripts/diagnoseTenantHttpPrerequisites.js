
import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import assert from "node:assert/strict";

import getInstituteModel from "../models/Institute.js";

import {
  getTenantCollectionName,
  TENANT_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const EXPECTED_DATABASE = "education_management_system";

const REQUIRED_MODELS = [
  "User",
  "Role",
  "Course",
  "Subject",
];

const run = async () => {
  console.log("");
  console.log("================================================");
  console.log("TENANT HTTP PREREQUISITES — READ-ONLY DIAGNOSTIC");
  console.log("================================================");

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from backend/.env."
    );
  }

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

  console.log("Database:", connection.name);

  const Institute = getInstituteModel(connection);

  // Read all institute records without modifying anything.
  const institutes = await Institute.find({})
    .select(
      "_id name slug status provisioningStatus collectionPrefix tenantInitializedAt createdAt"
    )
    .sort({ createdAt: 1 })
    .lean();

  // Read collection names only.
  const collectionRows = await connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const collectionNames = new Set(
    collectionRows.map((item) => item.name)
  );

  const tenantCollections = [...collectionNames].filter(
    (name) => name.startsWith("inst_")
  );

  console.log("");
  console.log("========== DATABASE SUMMARY ==========");
  console.log("Institute records:", institutes.length);
  console.log("Total collections:", collectionNames.size);
  console.log("Tenant-prefixed collections:", tenantCollections.length);
  console.log("Registered tenant models:", TENANT_MODEL_NAMES.length);
  console.log("======================================");

  const statusSummary = {};

  for (const institute of institutes) {
    const key =
      `${institute.status || "missing"} / ` +
      `${institute.provisioningStatus || "missing"}`;

    statusSummary[key] = (statusSummary[key] || 0) + 1;
  }

  console.log("");
  console.log("========== INSTITUTE STATUS COUNTS ==========");

  if (!Object.keys(statusSummary).length) {
    console.log("No Institute records found.");
  } else {
    for (const [status, count] of Object.entries(statusSummary)) {
      console.log(`${status}: ${count}`);
    }
  }

  console.log("=============================================");

  console.log("");
  console.log("========== INSTITUTE COLLECTION AUDIT ==========");

  let readyInstituteCount = 0;
  let userRoleReadyCount = 0;
  let courseSubjectReadyCount = 0;
  let fullyReadyCount = 0;

  for (const institute of institutes) {
    const prefix =
      institute.collectionPrefix ||
      `inst_${String(institute._id).toLowerCase()}`;

    const collectionStatus = {};

    for (const modelName of REQUIRED_MODELS) {
      const collectionName = getTenantCollectionName(
        {
          _id: institute._id,
          collectionPrefix: prefix,
        },
        modelName
      );

      collectionStatus[modelName] =
        collectionNames.has(collectionName);
    }

    const isReady =
      institute.status === "active" &&
      institute.provisioningStatus === "ready";

    if (isReady) readyInstituteCount++;

    const hasUserRole =
      collectionStatus.User && collectionStatus.Role;

    const hasCourseSubject =
      collectionStatus.Course && collectionStatus.Subject;

    if (isReady && hasUserRole) userRoleReadyCount++;
    if (isReady && hasCourseSubject) courseSubjectReadyCount++;

    if (isReady && hasUserRole && hasCourseSubject) {
      fullyReadyCount++;
    }

    console.log("");
    console.log("-----------------------------------------------");
    console.log("Institute:", institute.name);
    console.log("ID:", String(institute._id));
    console.log("Slug:", institute.slug);
    console.log("Status:", institute.status);
    console.log("Provisioning:", institute.provisioningStatus);
    console.log("Collection prefix:", prefix);
    console.log("Tenant initialized at:", institute.tenantInitializedAt || "not set");

    for (const modelName of REQUIRED_MODELS) {
      console.log(
        `${modelName} collection:`,
        collectionStatus[modelName] ? "EXISTS" : "MISSING"
      );
    }
  }

  console.log("");
  console.log("========== HTTP TEST READINESS ==========");
  console.log("Active + ready institutes:", readyInstituteCount);
  console.log("With existing User + Role collections:", userRoleReadyCount);
  console.log("With existing Course + Subject collections:", courseSubjectReadyCount);
  console.log("With all four required collections:", fullyReadyCount);
  console.log("=========================================");

  console.log("");
  console.log("========== TENANT COLLECTION SAMPLE ==========");

  for (const name of tenantCollections.slice(0, 40)) {
    console.log(name);
  }

  if (tenantCollections.length > 40) {
    console.log(
      `... and ${tenantCollections.length - 40} more tenant collections`
    );
  }

  console.log("===============================================");

  console.log("");
  console.log("READ-ONLY DIAGNOSTIC COMPLETE.");
  console.log("No records or collections were created, changed or deleted.");
};

run()
  .catch((error) => {
    console.error("");
    console.error("TENANT HTTP DIAGNOSTIC FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
