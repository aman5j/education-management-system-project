
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);


dotenv.config();

// Disable automatic index creation before importing model schemas.
mongoose.set("autoIndex", false);

import {
  TENANT_MODEL_NAMES,
  getTenantCollectionName,
} from "../config/tenantCollectionRegistry.js";

import {
  loadTenantModelDefinitions,
} from "../services/tenantSchemaLoader.js";

import {
  getTenantModel,
} from "../services/tenantModelFactory.js";

import {
  initializeTenantCollections,
} from "../services/tenantCollectionInitializer.js";

const EXPECTED_DATABASE = "education_management_system";

const createTestInstitute = (name) => {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    name,
    collectionPrefix: `inst_${String(id).toLowerCase()}`,
    status: "active",
    provisioningStatus: "ready",
  };
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }

  console.log(`PASS: ${message}`);
};

const isDuplicateKeyError = (error) =>
  error?.code === 11000;

const cleanupTestCollections = async (
  connection,
  institutes
) => {
  if (!connection?.db) return;

  console.log("");
  console.log("Cleaning temporary test collections...");

  for (const institute of institutes) {
    for (const modelName of TENANT_MODEL_NAMES) {
      const collectionName = getTenantCollectionName(
        institute,
        modelName
      );

      try {
        await connection.dropCollection(collectionName);
      } catch (error) {
        // NamespaceNotFound means the collection was never created.
        if (error.code !== 26 && error.codeName !== "NamespaceNotFound") {
          console.error(
            `Could not drop test collection ${collectionName}:`,
            error.message
          );
        }
      }
    }
  }

  console.log("Temporary test collection cleanup completed.");
};

const run = async () => {
  const institutes = [
    createTestInstitute("EMS Phase 3 Test Institute A"),
    createTestInstitute("EMS Phase 3 Test Institute B"),
  ];

  let connection;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env.");
    }

    console.log("Connecting to central EMS database...");

    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
      serverSelectionTimeoutMS: 15000,
    });

    connection = mongoose.connection;

    assert(
      connection.name === EXPECTED_DATABASE,
      `Connected to ${EXPECTED_DATABASE}`
    );

    console.log("");
    console.log("Loading tenant model definitions...");

    const definitions = await loadTenantModelDefinitions();

    assert(
      definitions.length === TENANT_MODEL_NAMES.length,
      `Loaded all ${TENANT_MODEL_NAMES.length} tenant schemas`
    );

    console.log("");
    console.log("Initializing temporary Institute A collections...");

    const reportA = await initializeTenantCollections({
      connection,
      institute: institutes[0],
      definitions,
    });

    assert(
      reportA.totalCollections === TENANT_MODEL_NAMES.length,
      "Institute A has all registered tenant collections"
    );

    console.log("");
    console.log("Initializing temporary Institute B collections...");

    const reportB = await initializeTenantCollections({
      connection,
      institute: institutes[1],
      definitions,
    });

    assert(
      reportB.totalCollections === TENANT_MODEL_NAMES.length,
      "Institute B has all registered tenant collections"
    );

    console.log("");
    console.log("Checking collection separation...");

    const studentCollectionA = getTenantCollectionName(
      institutes[0],
      "Student"
    );

    const studentCollectionB = getTenantCollectionName(
      institutes[1],
      "Student"
    );

    assert(
      studentCollectionA !== studentCollectionB,
      "Student collections are different for both institutes"
    );

    const courseCollectionA = getTenantCollectionName(
      institutes[0],
      "Course"
    );

    const courseCollectionB = getTenantCollectionName(
      institutes[1],
      "Course"
    );

    assert(
      courseCollectionA !== courseCollectionB,
      "Course collections are different for both institutes"
    );

    console.log("");
    console.log("Checking tenant-specific model registration...");

    const StudentA = getTenantModel(
      connection,
      institutes[0],
      "Student"
    );

    const StudentB = getTenantModel(
      connection,
      institutes[1],
      "Student"
    );

    assert(
      StudentA.collection.name === studentCollectionA &&
      StudentB.collection.name === studentCollectionB,
      "Student models resolve to their own institute collections"
    );

    console.log("");
    console.log("Testing institute-local unique values...");

    const sharedStudentData = {
      firstName: "Tenant",
      surname: "Isolation",
      mobile: "9000000000",
      email: "phase3-shared@example.test",
      rollNo: "PHASE3-SHARED-001",
    };

    const studentA = await StudentA.create(sharedStudentData);
    const studentB = await StudentB.create(sharedStudentData);

    assert(
      Boolean(studentA._id && studentB._id),
      "Same email and roll number can exist in separate institutes"
    );

    let duplicateRejected = false;

    try {
      await StudentA.create(sharedStudentData);
    } catch (error) {
      duplicateRejected = isDuplicateKeyError(error);
    }

    assert(
      duplicateRejected,
      "Duplicate student email/roll number is rejected within one institute"
    );

    const crossInstituteStudent = await StudentA.findById(
      studentB._id
    );

    assert(
      crossInstituteStudent === null,
      "Institute A cannot find Institute B's student by ID"
    );

    console.log("");
    console.log("Testing Subject and Course populate isolation...");

    const SubjectA = getTenantModel(
      connection,
      institutes[0],
      "Subject"
    );

    const SubjectB = getTenantModel(
      connection,
      institutes[1],
      "Subject"
    );

    const CourseA = getTenantModel(
      connection,
      institutes[0],
      "Course"
    );

    const CourseB = getTenantModel(
      connection,
      institutes[1],
      "Course"
    );

    const subjectA = await SubjectA.create({
      subjectName: "Institute A Mathematics",
      subjectCode: "PHASE3-SHARED-SUBJECT",
    });

    const subjectB = await SubjectB.create({
      subjectName: "Institute B Mathematics",
      subjectCode: "PHASE3-SHARED-SUBJECT",
    });

    const courseA = await CourseA.create({
      courseTitle: "Institute A Test Course",
      courseType: "Online",
      mrp: 1000,
      price: 800,
      subjects: [subjectA._id],
    });

    const courseB = await CourseB.create({
      courseTitle: "Institute B Test Course",
      courseType: "Online",
      mrp: 1200,
      price: 900,
      subjects: [subjectB._id],
    });

    const populatedCourseA = await CourseA.findById(
      courseA._id
    ).populate("subjects");

    const populatedCourseB = await CourseB.findById(
      courseB._id
    ).populate("subjects");


    console.log("\n========== POPULATE DEBUG ==========");

    console.log(
    "Course A subjects ref:",
    CourseA.schema.path("subjects")?.caster?.options?.ref,
    CourseA.schema.path("subjects")?.$embeddedSchemaType?.options?.ref
    );

    console.log(
    "Course B subjects ref:",
    CourseB.schema.path("subjects")?.caster?.options?.ref,
    CourseB.schema.path("subjects")?.$embeddedSchemaType?.options?.ref
    );

    console.log("Subject A model:", SubjectA.modelName);
    console.log("Subject B model:", SubjectB.modelName);

    console.log(
    "Course A populated subjects:",
    populatedCourseA.subjects?.map((subject) => ({
        id: subject?._id?.toString(),
        name: subject?.subjectName,
    }))
    );

    console.log(
    "Course B populated subjects:",
    populatedCourseB.subjects?.map((subject) => ({
        id: subject?._id?.toString(),
        name: subject?.subjectName,
    }))
    );

    console.log("========== END POPULATE DEBUG ==========\n");


    assert(
      populatedCourseA.subjects[0]?.subjectName ===
        "Institute A Mathematics",
      "Institute A Course populates Institute A Subject"
    );

    assert(
      populatedCourseB.subjects[0]?.subjectName ===
        "Institute B Mathematics",
      "Institute B Course populates Institute B Subject"
    );

    console.log("");
    console.log("Checking index initialization reports...");

    assert(
      reportA.results.every((item) => item.passed),
      "All Institute A collection indexes passed verification"
    );

    assert(
      reportB.results.every((item) => item.passed),
      "All Institute B collection indexes passed verification"
    );

    console.log("");
    console.log("========== PHASE 3C / 3D SUMMARY ==========");
    console.log(`Central database: ${connection.name}`);
    console.log(`Tenant schemas: ${definitions.length}`);
    console.log(`Institute A collections: ${reportA.totalCollections}`);
    console.log(`Institute B collections: ${reportB.totalCollections}`);
    console.log(`Institute A indexes: ${reportA.totalIndexes}`);
    console.log(`Institute B indexes: ${reportB.totalIndexes}`);
    console.log("Tenant separation: PASSED");
    console.log("Unique index isolation: PASSED");
    console.log("Populate isolation: PASSED");
    console.log("===========================================");
  } catch (error) {
    console.error("");
    console.error("Phase 3C / 3D test failed:");
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    if (
    connection?.readyState === 1 &&
    connection.name === EXPECTED_DATABASE
    ) {
    await cleanupTestCollections(connection, institutes);
    }

    await mongoose.disconnect();
  }
};

run();
