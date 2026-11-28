
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

import tenantCategoryIconService from "../services/tenantCategoryIcon.service.js";

import {
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
  getTenantCategory,
} from "../controllers/tenantCategory.controller.js";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

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

const createResponse = () => ({
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

const createRequest = (models, overrides = {}) => ({
  body: {},
  params: {},
  query: {},

  getTenantModel(modelName) {
    const model = models[modelName];

    if (!model) {
      throw new Error(`Tenant model "${modelName}" unavailable.`);
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
    for (const modelName of ["Category", "Course"]) {
      const collectionName = getTenantCollectionName(
        institute,
        modelName
      );

      try {
        await connection.db.dropCollection(collectionName);
        console.log(`Dropped temporary collection: ${collectionName}`);
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

const cleanupIconDirectories = async (institutes) => {
  for (const institute of institutes) {
    const tenantContext = {
      instituteId: String(institute._id),
      collectionPrefix: institute.collectionPrefix,
    };

    try {
      const iconsDirectory =
        await tenantCategoryIconService.getIconsDirectory(
          tenantContext
        );

      // Remove only this test's unique institute directory.
      const tenantRoot = path.resolve(
        iconsDirectory,
        "..",
        ".."
      );

      await fs.rm(tenantRoot, {
        recursive: true,
        force: true,
      });

      console.log(
        `Removed temporary icon directory: ${tenantRoot}`
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          "Icon directory cleanup failed:",
          error.message
        );
      }
    }
  }
};

const run = async () => {
  const instituteA = createTestInstitute(
    "EMS Category Isolation Test A"
  );

  const instituteB = createTestInstitute(
    "EMS Category Isolation Test B"
  );

  const institutes = [instituteA, instituteB];

  let connection;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from backend/.env."
      );
    }

    console.log("Connecting to central EMS database...");

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

    console.log("Loading tenant schema definitions...");

    const definitions = await loadTenantModelDefinitions();

    pass(`Loaded ${definitions.length} tenant schemas`);

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

    assert.notEqual(
      modelsA.Category.collection.name,
      modelsB.Category.collection.name
    );

    assert.notEqual(
      modelsA.Course.collection.name,
      modelsB.Course.collection.name
    );

    assert.equal(
      modelsA.Category.collection.name,
      getTenantCollectionName(instituteA, "Category")
    );

    assert.equal(
      modelsB.Category.collection.name,
      getTenantCollectionName(instituteB, "Category")
    );

    pass("Both institutes use separate Category and Course collections");

    // Create indexes only on the four temporary collections.
    await modelsA.Category.createIndexes();
    await modelsB.Category.createIndexes();

    await modelsA.Course.createIndexes();
    await modelsB.Course.createIndexes();

    pass("Temporary Category and Course indexes created");

    console.log("\nTesting category CRUD isolation...");

    const createA = await invokeController(
      createTenantCategory,
      createRequest(modelsA, {
        body: {
          categoryName: "Science",
          displayOrder: 1,
          status: "Active",
        },
      })
    );

    const createB = await invokeController(
      createTenantCategory,
      createRequest(modelsB, {
        body: {
          categoryName: "Science",
          displayOrder: 1,
          status: "Active",
        },
      })
    );

    assert.equal(createA.statusCode, 201);
    assert.equal(createB.statusCode, 201);

    const categoryA = createA.body.data;
    const categoryB = createB.body.data;

    assert.ok(categoryA?._id);
    assert.ok(categoryB?._id);

    assert.notEqual(
      String(categoryA._id),
      String(categoryB._id)
    );

    pass("Both institutes independently created the same category name");

    const duplicateA = await invokeController(
      createTenantCategory,
      createRequest(modelsA, {
        body: {
          categoryName: "science",
          displayOrder: 2,
          status: "Active",
        },
      })
    );

    assert.equal(duplicateA.statusCode, 409);

    pass("Case-insensitive duplicate category is rejected within Institute A");

    const crossInstituteLookup = await invokeController(
      getTenantCategory,
      createRequest(modelsB, {
        params: {
          id: String(categoryA._id),
        },
      })
    );

    assert.equal(crossInstituteLookup.statusCode, 404);

    pass("Institute B cannot retrieve Institute A's category by ID");

    const ownCategoryLookup = await invokeController(
      getTenantCategory,
      createRequest(modelsB, {
        params: {
          id: String(categoryB._id),
        },
      })
    );

    assert.equal(ownCategoryLookup.statusCode, 200);

    pass("Institute B can retrieve its own category");

    console.log("\nTesting course-category relationship protection...");

    await modelsA.Course.create({
      courseTitle: "Isolation Test Course",
      courseType: "Online",
      courseCategory: "Science",
      mrp: 1000,
      price: 800,
      status: "Draft",
    });

    const renameA = await invokeController(
      updateTenantCategory,
      createRequest(modelsA, {
        params: {
          id: String(categoryA._id),
        },
        body: {
          categoryName: "Technology",
        },
      })
    );

    assert.equal(renameA.statusCode, 409);

    pass("Institute A cannot rename a category used by its course");

    const deleteA = await invokeController(
      deleteTenantCategory,
      createRequest(modelsA, {
        params: {
          id: String(categoryA._id),
        },
      })
    );

    assert.equal(deleteA.statusCode, 409);

    pass("Institute A cannot delete a category used by its course");

    const renameB = await invokeController(
      updateTenantCategory,
      createRequest(modelsB, {
        params: {
          id: String(categoryB._id),
        },
        body: {
          categoryName: "Technology",
        },
      })
    );

    assert.equal(renameB.statusCode, 200);

    assert.equal(
      renameB.body.data.categoryName,
      "Technology"
    );

    pass("Institute B can rename its category independently");

    const deleteB = await invokeController(
      deleteTenantCategory,
      createRequest(modelsB, {
        params: {
          id: String(categoryB._id),
        },
      })
    );

    assert.equal(deleteB.statusCode, 200);

    pass("Institute B can delete its own unreferenced category");

    console.log("\nTesting category icon file isolation...");

    const tenantContextA = {
      instituteId: String(instituteA._id),
      collectionPrefix: instituteA.collectionPrefix,
    };

    const tenantContextB = {
      instituteId: String(instituteB._id),
      collectionPrefix: instituteB.collectionPrefix,
    };

    const iconBufferA = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10,
      65, 65, 65, 65,
    ]);

    const iconBufferB = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10,
      66, 66, 66, 66,
    ]);

    const iconA = await tenantCategoryIconService.saveIcon(
      tenantContextA,
      iconBufferA,
      "image/png"
    );

    const iconB = await tenantCategoryIconService.saveIcon(
      tenantContextB,
      iconBufferB,
      "image/png"
    );

    assert.notEqual(iconA.filePath, iconB.filePath);

    pass("Institute A and B store icons in different directories");

    const readA = await tenantCategoryIconService.readIcon(
      tenantContextA,
      iconA.fileName
    );

    const readB = await tenantCategoryIconService.readIcon(
      tenantContextB,
      iconB.fileName
    );

    assert.ok(readA);
    assert.ok(readB);

    assert.deepEqual(
      await fs.readFile(readA.path),
      iconBufferA
    );

    assert.deepEqual(
      await fs.readFile(readB.path),
      iconBufferB
    );

    pass("Each institute reads its own icon contents");

    const crossRead = await tenantCategoryIconService.readIcon(
      tenantContextB,
      iconA.fileName
    );

    assert.equal(crossRead, null);

    pass("Institute B cannot read Institute A's icon");

    await tenantCategoryIconService.deleteIcon(
      tenantContextB,
      iconA.fileName
    );

    const iconStillExists = await tenantCategoryIconService.readIcon(
      tenantContextA,
      iconA.fileName
    );

    assert.ok(iconStillExists);

    pass("Institute B cannot delete Institute A's icon");

    await tenantCategoryIconService.deleteIcon(
      tenantContextA,
      iconA.fileName
    );

    await tenantCategoryIconService.deleteIcon(
      tenantContextB,
      iconB.fileName
    );

    pass("Each institute can delete only its own icon");

    console.log("\n========================================");
    console.log("TENANT CATEGORY ISOLATION");
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

    await cleanupIconDirectories(institutes);

    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("\nTENANT CATEGORY ISOLATION FAILED");
  console.error(error);
  process.exitCode = 1;
});
