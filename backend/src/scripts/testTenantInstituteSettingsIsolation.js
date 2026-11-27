
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
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

import {
  updateTenantInstituteSettings,
  getTenantPublicInstituteBranding,
  getTenantInstituteLogo,
} from "../controllers/tenantInstituteSettings.controller.js";

dotenv.config();

// Match the DNS configuration used by the existing tenant isolation test.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const EXPECTED_DATABASE = "education_management_system";

const TEST_LOGO_VERSION = "tenant-isolation-shared-logo-version";

const validPngA = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  65, 65, 65, 65,
]);

const validPngB = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  66, 66, 66, 66,
]);

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
  headers: {},
  binary: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  },

  set(headers) {
    Object.assign(this.headers, headers);
    return this;
  },

  end(value) {
    this.binary = value;
    return this;
  },
});

const createRequest = (models, overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  tenantUser: {
    _id: new mongoose.Types.ObjectId(),
  },

  getTenantModel(modelName) {
    const model = models[modelName];

    if (!model) {
      throw new Error(
        `Tenant model "${modelName}" is unavailable.`
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

const assertPass = (message) => {
  console.log(`PASS: ${message}`);
};

const cleanupCollections = async (
  connection,
  institutes
) => {
  if (!connection?.db) return;

  console.log("");
  console.log("Cleaning temporary settings and logo collections...");

  for (const institute of institutes) {
    for (const modelName of [
      "InstituteSettings",
      "InstituteLogo",
    ]) {
      const collectionName = getTenantCollectionName(
        institute,
        modelName
      );

      try {
        await connection.db.dropCollection(collectionName);
        console.log(`Dropped: ${collectionName}`);
      } catch (error) {
        if (
          error.code !== 26 &&
          error.codeName !== "NamespaceNotFound"
        ) {
          console.error(
            `Could not drop ${collectionName}:`,
            error.message
          );
        }
      }
    }
  }
};

const run = async () => {
  const instituteA = createTestInstitute(
    "EMS Settings Isolation Test A"
  );

  const instituteB = createTestInstitute(
    "EMS Settings Isolation Test B"
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
      `Expected database ${EXPECTED_DATABASE}, received ${connection.name}`
    );

    assertPass(
      `Connected to ${EXPECTED_DATABASE}`
    );

    console.log("");
    console.log("Loading tenant schema definitions...");

    const definitions = await loadTenantModelDefinitions();

    assertPass(
      `Loaded ${definitions.length} tenant schema definitions`
    );

    console.log("");
    console.log("Registering isolated tenant model sets...");

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
      modelsA.InstituteSettings.collection.name,
      modelsB.InstituteSettings.collection.name
    );

    assert.notEqual(
      modelsA.InstituteLogo.collection.name,
      modelsB.InstituteLogo.collection.name
    );

    assertPass(
      "Institute A and B use different settings and logo collections"
    );

    // Create indexes only for the four temporary collections.
    await modelsA.InstituteSettings.createIndexes();
    await modelsA.InstituteLogo.createIndexes();
    await modelsB.InstituteSettings.createIndexes();
    await modelsB.InstituteLogo.createIndexes();

    assertPass(
      "Temporary settings and logo collection indexes created"
    );

    console.log("");
    console.log("Testing settings isolation...");

    const updateA = await invokeController(
      updateTenantInstituteSettings,
      createRequest(modelsA, {
        body: {
          instituteName: "Institute Alpha",
          email: "alpha@example.com",
        },
      })
    );

    const updateB = await invokeController(
      updateTenantInstituteSettings,
      createRequest(modelsB, {
        body: {
          instituteName: "Institute Beta",
          email: "beta@example.com",
        },
      })
    );

    assert.equal(updateA.statusCode, 200);
    assert.equal(updateB.statusCode, 200);

    assertPass(
      "Both institutes can independently save their settings"
    );

    const settingsA =
      await modelsA.InstituteSettings.findOne({
        key: "default",
      }).lean();

    const settingsB =
      await modelsB.InstituteSettings.findOne({
        key: "default",
      }).lean();

    assert.equal(settingsA.instituteName, "Institute Alpha");
    assert.equal(settingsB.instituteName, "Institute Beta");

    assert.equal(settingsA.email, "alpha@example.com");
    assert.equal(settingsB.email, "beta@example.com");

    assertPass(
      "Institute A and B retain different settings records"
    );

    const brandingA = await invokeController(
      getTenantPublicInstituteBranding,
      createRequest(modelsA)
    );

    const brandingB = await invokeController(
      getTenantPublicInstituteBranding,
      createRequest(modelsB)
    );

    assert.equal(brandingA.statusCode, 200);
    assert.equal(brandingB.statusCode, 200);

    assertPass(
      "Public branding reads through each institute's own settings model"
    );

    console.log("");
    console.log("Testing logo version isolation...");

    // Deliberately use the same version string in both institutes.
    // The unique index is per tenant collection, not global.
    await modelsA.InstituteLogo.create({
      version: TEST_LOGO_VERSION,
      contentType: "image/png",
      data: validPngA,
      size: validPngA.length,
    });

    await modelsB.InstituteLogo.create({
      version: TEST_LOGO_VERSION,
      contentType: "image/png",
      data: validPngB,
      size: validPngB.length,
    });

    assertPass(
      "The same logo version can exist independently in both tenant collections"
    );

    const logoA = await invokeController(
      getTenantInstituteLogo,
      createRequest(modelsA, {
        params: {
          version: TEST_LOGO_VERSION,
        },
      })
    );

    const logoB = await invokeController(
      getTenantInstituteLogo,
      createRequest(modelsB, {
        params: {
          version: TEST_LOGO_VERSION,
        },
      })
    );

    assert.equal(logoA.statusCode, 200);
    assert.equal(logoB.statusCode, 200);

    // Mongoose returns MongooseBuffer instances.
    // Normalize them into ordinary Node.js Buffers before comparison.
    const actualLogoA = Buffer.from(logoA.binary);
    const actualLogoB = Buffer.from(logoB.binary);

    assert.deepEqual(actualLogoA, validPngA);
    assert.deepEqual(actualLogoB, validPngB);

    assertPass(
    "Logo retrieval returns Institute A's own image"
    );

    assertPass(
    "Logo retrieval returns Institute B's own image"
    );

    assert.notDeepEqual(actualLogoA, actualLogoB);

    assertPass(
    "Identical logo version identifiers cannot expose another institute's image"
    );

    // assertPass(
    //   "Logo retrieval returns Institute A's own image"
    // );

    // assertPass(
    //   "Logo retrieval returns Institute B's own image"
    // );

    // assert.notDeepEqual(
    //   logoA.binary,
    //   logoB.binary
    // );

    // assertPass(
    //   "Identical logo version identifiers cannot expose another institute's image"
    // );

    console.log("");
    console.log("Verifying physical collection names...");

    assert.equal(
      modelsA.InstituteSettings.collection.name,
      getTenantCollectionName(
        instituteA,
        "InstituteSettings"
      )
    );

    assert.equal(
      modelsB.InstituteSettings.collection.name,
      getTenantCollectionName(
        instituteB,
        "InstituteSettings"
      )
    );

    assert.equal(
      modelsA.InstituteLogo.collection.name,
      getTenantCollectionName(
        instituteA,
        "InstituteLogo"
      )
    );

    assert.equal(
      modelsB.InstituteLogo.collection.name,
      getTenantCollectionName(
        instituteB,
        "InstituteLogo"
      )
    );

    assertPass(
      "All four models point to their expected tenant collection names"
    );

    console.log("");
    console.log("========================================");
    console.log("TENANT INSTITUTE SETTINGS ISOLATION");
    console.log("========================================");
    console.log("Result: ALL CHECKS PASSED");
    console.log("Institute A:", String(instituteA._id));
    console.log("Institute B:", String(instituteB._id));
    console.log("Database:", connection.name);
    console.log("========================================");
  } finally {
    if (connection?.readyState === 1) {
      await cleanupCollections(connection, institutes);
    }

    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("");
  console.error("TENANT SETTINGS ISOLATION FAILED");
  console.error(error);
  process.exitCode = 1;
});
