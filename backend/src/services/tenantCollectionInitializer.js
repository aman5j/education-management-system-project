
import {
  getTenantCollectionName,
  TENANT_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

import {
  registerTenantModelSet,
} from "./tenantModelFactory.js";

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(value[key])}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const verifySchemaIndexes = async (model) => {
  const expectedIndexes = model.schema.indexes();
  const actualIndexes = await model.collection.indexes();

  const uniqueExpected = new Map();

  for (const [key, options] of expectedIndexes) {
    const signature = stableStringify({
      key,
      unique: Boolean(options.unique),
      sparse: Boolean(options.sparse),
      expireAfterSeconds: options.expireAfterSeconds ?? null,
      partialFilterExpression:
        options.partialFilterExpression ?? null,
    });

    // Avoid checking an identical index definition twice.
    uniqueExpected.set(signature, { key, options });
  }

  const missing = [];

  for (const { key, options } of uniqueExpected.values()) {
    const found = actualIndexes.find((actual) => {
      if (stableStringify(actual.key) !== stableStringify(key)) {
        return false;
      }

      if (
        Boolean(options.unique) !== Boolean(actual.unique)
      ) {
        return false;
      }

      if (
        Boolean(options.sparse) !== Boolean(actual.sparse)
      ) {
        return false;
      }

      if (
        options.expireAfterSeconds != null &&
        Number(options.expireAfterSeconds) !==
          Number(actual.expireAfterSeconds)
      ) {
        return false;
      }

      if (
        options.partialFilterExpression &&
        stableStringify(options.partialFilterExpression) !==
          stableStringify(actual.partialFilterExpression)
      ) {
        return false;
      }

      return true;
    });

    if (!found) {
      missing.push({
        key,
        options,
      });
    }
  }

  return {
    expected: uniqueExpected.size,
    actual: actualIndexes.length,
    missing,
    passed: missing.length === 0,
  };
};

/**
 * Creates all registered tenant collections and their indexes.
 *
 * This function does not:
 * - migrate existing records
 * - delete existing collections
 * - modify central platform collections
 * - accept collection names from browser input
 */
export const initializeTenantCollections = async ({
  connection,
  institute,
  definitions,
}) => {
  if (!connection || connection.readyState !== 1 || !connection.db) {
    throw new Error("A connected MongoDB connection is required.");
  }

  if (!institute?._id) {
    throw new Error("A valid institute record is required.");
  }

  const models = registerTenantModelSet(
    connection,
    institute,
    definitions
  );

  const results = [];

  for (const modelName of TENANT_MODEL_NAMES) {
    const model = models[modelName];

    if (!model) {
      throw new Error(
        `Tenant model "${modelName}" was not registered.`
      );
    }

    const expectedCollection = getTenantCollectionName(
      institute,
      modelName
    );

    if (model.collection.name !== expectedCollection) {
      throw new Error(
        `Collection mismatch for ${modelName}: ` +
        `${model.collection.name} !== ${expectedCollection}`
      );
    }

    const exists = await connection.db
      .listCollections(
        { name: expectedCollection },
        { nameOnly: true }
      )
      .hasNext();

    if (!exists) {
      await connection.db.createCollection(expectedCollection);
    }

    // Explicitly create indexes and wait for MongoDB.
    await model.createIndexes();

    const indexReport = await verifySchemaIndexes(model);

    if (!indexReport.passed) {
      throw new Error(
        `Index verification failed for ${modelName} ` +
        `(${expectedCollection}): ` +
        JSON.stringify(indexReport.missing)
      );
    }

    results.push({
      modelName,
      collectionName: expectedCollection,
      indexCount: indexReport.expected,
      passed: true,
    });
  }

  return {
    instituteId: String(institute._id),
    collectionPrefix: `inst_${String(institute._id).toLowerCase()}`,
    totalCollections: results.length,
    totalIndexes: results.reduce(
      (sum, item) => sum + item.indexCount,
      0
    ),
    results,
  };
};
