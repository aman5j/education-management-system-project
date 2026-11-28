
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

import {
  getTenantCollectionName,
} from "../config/tenantCollectionRegistry.js";

import {
  loadTenantModelDefinitions,
} from "../services/tenantSchemaLoader.js";

import {
  registerTenantModelSet,
} from "../services/tenantModelFactory.js";

import tenantCourseImageService from "../services/tenantCourseImage.service.js";

import {
  createTenantCourse,
  getTenantCourse,
} from "../controllers/tenantCourse.controller.js";

import {
  createTenantSubject,
  getTenantSubject,
} from "../controllers/tenantSubject.controller.js";

import {
  uploadTenantCourseImage,
  getTenantCourseImage,
  deleteTenantCourseImage,
} from "../controllers/tenantCourseImage.controller.js";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const EXPECTED_DATABASE = "education_management_system";

const TEST_COLLECTION_MODELS = [
  "Category",
  "Course",
  "Subject",
];

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

const getTenantContext = (institute) => ({
  instituteId: String(institute._id),
  collectionPrefix: institute.collectionPrefix,
});

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  sentFilePath: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  },

  set(headers) {
    this.headers = {
      ...this.headers,
      ...headers,
    };

    return this;
  },

  sendFile(filePath) {
    this.sentFilePath = filePath;
    return this;
  },
});

const createRequest = (
  models,
  institute,
  overrides = {}
) => ({
  body: {},
  params: {},
  query: {},

  tenantContext: getTenantContext(institute),

  getTenantModel(modelName) {
    const model = models[modelName];

    if (!model) {
      throw new Error(
        `Tenant model "${modelName}" unavailable.`
      );
    }

    return model;
  },

  ...overrides,
});

const invokeController = async (controller, req) => {
  const res = createResponse();
  let nextError = null;

  await controller(req, res, (error) => {
    nextError = error || null;
  });

  if (nextError) {
    throw nextError;
  }

  return res;
};

const pass = (message) => {
  console.log(`PASS: ${message}`);
};

const dropTemporaryCollections = async (
  connection,
  institutes
) => {
  for (const institute of institutes) {
    for (const modelName of TEST_COLLECTION_MODELS) {
      const collectionName = getTenantCollectionName(
        institute,
        modelName
      );

      try {
        await connection.db.dropCollection(collectionName);

        console.log(
          `Dropped temporary collection: ${collectionName}`
        );
      } catch (error) {
        if (
          error.code !== 26 &&
          error.codeName !== "NamespaceNotFound"
        ) {
          console.error(
            `Cleanup failed for ${collectionName}:`,
            error.message
          );
        }
      }
    }
  }
};

const cleanupCourseImageDirectories = async (institutes) => {
  for (const institute of institutes) {
    const context = getTenantContext(institute);

    try {
      const imagesDirectory =
        await tenantCourseImageService.getCourseImageDirectory(
          context
        );

      // images -> courses -> inst_<instituteId>
      // Each test institute has a unique temporary ObjectId.
      const tenantRoot = path.resolve(
        imagesDirectory,
        "..",
        ".."
      );

      await fs.rm(tenantRoot, {
        recursive: true,
        force: true,
      });

      console.log(
        `Removed temporary Course image directory: ${tenantRoot}`
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          "Course image directory cleanup failed:",
          error.message
        );
      }
    }
  }
};

const createCourse = async (
  models,
  institute,
  subjectId,
  title
) => {
  return invokeController(
    createTenantCourse,
    createRequest(models, institute, {
      body: {
        courseTitle: title,
        courseType: "Online",
        courseCategory: "Science",
        mrp: 10000,
        price: 8000,
        subjects: [String(subjectId)],
        status: "Draft",
      },
    })
  );
};

const createSubject = async (
  models,
  institute,
  subjectName,
  subjectCode,
  courseId
) => {
  return invokeController(
    createTenantSubject,
    createRequest(models, institute, {
      body: {
        subjectName,
        subjectCode,
        description: "Batch 2E integration test subject",
        status: "Active",
        ...(courseId ? { course_id: String(courseId) } : {}),
      },
    })
  );
};

const run = async () => {
  const instituteA = createTestInstitute(
    "EMS Course Subject Isolation Test A"
  );

  const instituteB = createTestInstitute(
    "EMS Course Subject Isolation Test B"
  );

  const institutes = [instituteA, instituteB];

  let connection;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from backend/.env."
      );
    }

    console.log("========================================");
    console.log("BATCH 2E — COURSE & SUBJECT ISOLATION");
    console.log("========================================");

    console.log("\nConnecting to central EMS database...");

    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
      serverSelectionTimeoutMS: 15000,
    });

    connection = mongoose.connection;

    assert.equal(
      connection.name,
      EXPECTED_DATABASE,
      `Expected ${EXPECTED_DATABASE}, received ${connection.name}`
    );

    pass(`Connected to ${EXPECTED_DATABASE}`);

    console.log("\nLoading tenant schema definitions...");

    const definitions = await loadTenantModelDefinitions();

    pass(`Loaded ${definitions.length} tenant schema definitions`);

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

    // -----------------------------------------
    // 1. Verify tenant collection registration
    // -----------------------------------------

    for (const modelName of TEST_COLLECTION_MODELS) {
      const collectionA = modelsA[modelName].collection.name;
      const collectionB = modelsB[modelName].collection.name;

      assert.equal(
        collectionA,
        getTenantCollectionName(instituteA, modelName)
      );

      assert.equal(
        collectionB,
        getTenantCollectionName(instituteB, modelName)
      );

      assert.notEqual(
        collectionA,
        collectionB,
        `${modelName} collections must be different`
      );
    }

    pass(
      "Both institutes have separate Category, Course and Subject collections"
    );

    // Create indexes only on temporary test collections.
    for (const models of [modelsA, modelsB]) {
      await models.Category.createIndexes();
      await models.Course.createIndexes();
      await models.Subject.createIndexes();
    }

    pass("Temporary test collection indexes created");

    // -----------------------------------------
    // 2. Create independent categories
    // -----------------------------------------

    const [categoryA, categoryB] = await Promise.all([
      modelsA.Category.create({
        categoryName: "Science",
        displayOrder: 1,
        status: "Active",
      }),

      modelsB.Category.create({
        categoryName: "Science",
        displayOrder: 1,
        status: "Active",
      }),
    ]);

    assert.ok(categoryA._id);
    assert.ok(categoryB._id);

    pass(
      "Both institutes independently created the same category name"
    );

    // -----------------------------------------
    // 3. Create independent subjects
    // -----------------------------------------

    const subjectAResponse = await createSubject(
      modelsA,
      instituteA,
      "Institute A Mathematics",
      "B2E-A-MATH"
    );

    const subjectBResponse = await createSubject(
      modelsB,
      instituteB,
      "Institute B Mathematics",
      "B2E-B-MATH"
    );

    assert.equal(subjectAResponse.statusCode, 201);
    assert.equal(subjectBResponse.statusCode, 201);

    const subjectA = subjectAResponse.body.data;
    const subjectB = subjectBResponse.body.data;

    assert.ok(subjectA?._id);
    assert.ok(subjectB?._id);

    assert.notEqual(
      String(subjectA._id),
      String(subjectB._id)
    );

    pass(
      "Both institutes independently created their own Subject"
    );

    // -----------------------------------------
    // 4. Create independent courses
    // -----------------------------------------

    const courseAResponse = await createCourse(
      modelsA,
      instituteA,
      subjectA._id,
      "Institute A MERN Course"
    );

    const courseBResponse = await createCourse(
      modelsB,
      instituteB,
      subjectB._id,
      "Institute B MERN Course"
    );

    assert.equal(courseAResponse.statusCode, 201);
    assert.equal(courseBResponse.statusCode, 201);

    const courseA = courseAResponse.body.data;
    const courseB = courseBResponse.body.data;

    assert.ok(courseA?._id);
    assert.ok(courseB?._id);

    assert.notEqual(
      String(courseA._id),
      String(courseB._id)
    );

    assert.equal(
      String(courseA.subjects[0]._id),
      String(subjectA._id)
    );

    assert.equal(
      String(courseB.subjects[0]._id),
      String(subjectB._id)
    );

    pass(
      "Both institutes created Courses with their own populated Subjects"
    );

    // -----------------------------------------
    // 5. Reject cross-institute Subject reference
    // -----------------------------------------

    const invalidCourseResponse = await createCourse(
      modelsA,
      instituteA,
      subjectB._id,
      "Invalid Cross Institute Course"
    );

    assert.equal(invalidCourseResponse.statusCode, 400);

    pass(
      "Institute A cannot assign Institute B's Subject to its Course"
    );

    // -----------------------------------------
    // 6. Reject cross-institute Course reference
    // -----------------------------------------

    const invalidSubjectResponse = await createSubject(
      modelsB,
      instituteB,
      "Invalid Cross Institute Subject",
      "B2E-INVALID-REF",
      courseA._id
    );

    assert.equal(invalidSubjectResponse.statusCode, 400);

    pass(
      "Institute B cannot reference Institute A's Course from Subject"
    );

    // -----------------------------------------
    // 7. Verify Course and Subject retrieval
    // -----------------------------------------

    const ownCourseA = await invokeController(
      getTenantCourse,
      createRequest(modelsA, instituteA, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    const ownCourseB = await invokeController(
      getTenantCourse,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(courseB._id),
        },
      })
    );

    assert.equal(ownCourseA.statusCode, 200);
    assert.equal(ownCourseB.statusCode, 200);

    const crossCourseLookup = await invokeController(
      getTenantCourse,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    assert.equal(crossCourseLookup.statusCode, 404);

    pass(
      "Course retrieval is isolated between institutes"
    );

    const ownSubjectA = await invokeController(
      getTenantSubject,
      createRequest(modelsA, instituteA, {
        params: {
          id: String(subjectA._id),
        },
      })
    );

    const ownSubjectB = await invokeController(
      getTenantSubject,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(subjectB._id),
        },
      })
    );

    assert.equal(ownSubjectA.statusCode, 200);
    assert.equal(ownSubjectB.statusCode, 200);

    const crossSubjectLookup = await invokeController(
      getTenantSubject,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(subjectA._id),
        },
      })
    );

    assert.equal(crossSubjectLookup.statusCode, 404);

    pass(
      "Subject retrieval is isolated between institutes"
    );

    // -----------------------------------------
    // 8. Upload separate private Course images
    // -----------------------------------------

    const pngBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10,
      65, 66, 67, 68,
    ]);

    const imageAResponse = await invokeController(
      uploadTenantCourseImage,
      createRequest(modelsA, instituteA, {
        params: {
          id: String(courseA._id),
        },
        file: {
          buffer: pngBuffer,
          mimetype: "image/png",
        },
      })
    );

    const imageBResponse = await invokeController(
      uploadTenantCourseImage,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(courseB._id),
        },
        file: {
          buffer: pngBuffer,
          mimetype: "image/png",
        },
      })
    );

    assert.equal(imageAResponse.statusCode, 200);
    assert.equal(imageBResponse.statusCode, 200);

    const imageAFileName =
      imageAResponse.body.data.courseImage;

    const imageBFileName =
      imageBResponse.body.data.courseImage;

    assert.ok(imageAFileName);
    assert.ok(imageBFileName);

    assert.notEqual(imageAFileName, imageBFileName);

    const contextA = getTenantContext(instituteA);
    const contextB = getTenantContext(instituteB);

    const storedImageA =
      await tenantCourseImageService.readImage(
        contextA,
        imageAFileName
      );

    const storedImageB =
      await tenantCourseImageService.readImage(
        contextB,
        imageBFileName
      );

    assert.ok(storedImageA);
    assert.ok(storedImageB);

    assert.notEqual(
      storedImageA.path,
      storedImageB.path
    );

    pass(
      "Course images are stored in separate institute directories"
    );

    // -----------------------------------------
    // 9. Verify cross-institute image protection
    // -----------------------------------------

    const crossImageRead = await tenantCourseImageService.readImage(
      contextB,
      imageAFileName
    );

    assert.equal(crossImageRead, null);

    const ownImageResponse = await invokeController(
      getTenantCourseImage,
      createRequest(modelsA, instituteA, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    assert.equal(ownImageResponse.statusCode, 200);

    assert.equal(
      ownImageResponse.sentFilePath,
      storedImageA.path
    );

    const crossImageEndpoint = await invokeController(
      getTenantCourseImage,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    assert.equal(crossImageEndpoint.statusCode, 404);

    pass(
      "Institute B cannot retrieve Institute A's private Course image"
    );

    // -----------------------------------------
    // 10. Verify cross-institute image deletion
    // -----------------------------------------

    const crossDeleteResponse = await invokeController(
      deleteTenantCourseImage,
      createRequest(modelsB, instituteB, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    assert.equal(crossDeleteResponse.statusCode, 404);

    const imageStillExists =
      await tenantCourseImageService.readImage(
        contextA,
        imageAFileName
      );

    assert.ok(imageStillExists);

    pass(
      "Institute B cannot delete Institute A's Course image"
    );

    // -----------------------------------------
    // 11. Verify own image deletion
    // -----------------------------------------

    const ownDeleteResponse = await invokeController(
      deleteTenantCourseImage,
      createRequest(modelsA, instituteA, {
        params: {
          id: String(courseA._id),
        },
      })
    );

    assert.equal(ownDeleteResponse.statusCode, 200);

    const deletedImage =
      await tenantCourseImageService.readImage(
        contextA,
        imageAFileName
      );

    assert.equal(deletedImage, null);

    const imageBStillExists =
      await tenantCourseImageService.readImage(
        contextB,
        imageBFileName
      );

    assert.ok(imageBStillExists);

    pass(
      "Institute A can delete its own image without affecting Institute B"
    );

    console.log("\n========================================");
    console.log("BATCH 2E — ISOLATION TEST SUMMARY");
    console.log("========================================");
    console.log("Result: ALL CHECKS PASSED");
    console.log("Institute A:", String(instituteA._id));
    console.log("Institute B:", String(instituteB._id));
    console.log("Database:", connection.name);
    console.log("========================================");
  } finally {
    if (connection?.readyState === 1) {
      await dropTemporaryCollections(
        connection,
        institutes
      );
    }

    await cleanupCourseImageDirectories(institutes);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

run().catch((error) => {
  console.error("\nBATCH 2E ISOLATION TEST FAILED");
  console.error(error);
  process.exitCode = 1;
});
