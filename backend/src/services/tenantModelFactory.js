
import {
  getTenantCollectionName,
  getTenantCollectionPrefix,
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

const registeredModelSets = new WeakMap();

const getInternalModelName = (prefix, modelName) =>
  `${modelName}__${prefix}`;

const rewriteSchemaReferences = (
  schema,
  prefix,
  visited = new Set()
) => {
  if (!schema || visited.has(schema)) return;

  visited.add(schema);

  schema.eachPath((pathName, schemaType) => {
    const options = schemaType?.options;

    if (options?.ref) {
      if (typeof options.ref === "string") {
        options.ref = getInternalModelName(
          prefix,
          options.ref
        );
      } else {
        throw new Error(
          `Dynamic ref is not supported automatically at "${pathName}". ` +
          "It requires an explicit tenant reference audit."
        );
      }
    }

    if (options?.refPath) {
      throw new Error(
        `refPath at "${pathName}" requires an explicit tenant reference audit.`
      );
    }

    if (schemaType?.schema) {
      rewriteSchemaReferences(
        schemaType.schema,
        prefix,
        visited
      );
    }

    if (schemaType?.caster?.schema) {
      rewriteSchemaReferences(
        schemaType.caster.schema,
        prefix,
        visited
      );
    }
  });

  for (const virtual of Object.values(schema.virtuals || {})) {
    const ref = virtual?.options?.ref;

    if (typeof ref === "string") {
      virtual.options.ref = getInternalModelName(
        prefix,
        ref
      );
    } else if (ref) {
      throw new Error(
        "Dynamic virtual populate references require explicit review."
      );
    }

    if (virtual?.options?.refPath) {
      throw new Error(
        "Virtual refPath requires an explicit tenant reference audit."
      );
    }
  }
};

/**
 * Register every model for one institute on the shared connection.
 *
 * definitions:
 * [
 *   { name: "Student", schema: studentSchema },
 *   { name: "Course", schema: courseSchema }
 * ]
 *
 * Register the complete model set before using populate().
 */
export const registerTenantModelSet = (
  connection,
  institute,
  definitions
) => {
  if (!connection || connection.readyState !== 1) {
    throw new Error("MongoDB connection is not ready.");
  }

  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error("Tenant model definitions are required.");
  }

  const prefix = getTenantCollectionPrefix(institute);

  let connectionCache = registeredModelSets.get(connection);

  if (!connectionCache) {
    connectionCache = new Map();
    registeredModelSets.set(connection, connectionCache);
  }

  if (connectionCache.has(prefix)) {
    return connectionCache.get(prefix);
  }

  const names = new Set(
    definitions.map((definition) => definition?.name)
  );

  // Validate the complete set before registering any model.
  for (const definition of definitions) {
    if (
      !definition?.name ||
      !definition?.schema ||
      !isTenantModel(definition.name)
    ) {
      throw new Error(
        `Invalid or unregistered tenant model: ${definition?.name || "unknown"}`
      );
    }
  }

  // Ensure references point only to models in this institute model set.
  for (const definition of definitions) {
    definition.schema.eachPath((pathName, schemaType) => {
      const ref = schemaType?.options?.ref;

      if (
        typeof ref === "string" &&
        isTenantModel(ref) &&
        !names.has(ref)
      ) {
        throw new Error(
          `Model "${definition.name}" references "${ref}", ` +
          "but that model is missing from the registered model set."
        );
      }
    });
  }

  const models = {};

  // First clone and rewrite schemas.
  const prepared = definitions.map(({ name, schema }) => {
    const tenantSchema = schema.clone();

    rewriteSchemaReferences(tenantSchema, prefix);

    return {
      name,
      tenantSchema,
      collectionName: getTenantCollectionName(
        institute,
        name
      ),
      internalName: getInternalModelName(prefix, name),
    };
  });

  // Then register all models on the same connection.
  for (const item of prepared) {
    const existing = connection.models[item.internalName];

    if (existing) {
      if (existing.collection.name !== item.collectionName) {
        throw new Error(
          `Model collection mismatch for ${item.name}.`
        );
      }

      models[item.name] = existing;
      continue;
    }

    models[item.name] = connection.model(
      item.internalName,
      item.tenantSchema,
      item.collectionName
    );
  }

  connectionCache.set(prefix, models);

  return models;
};

export const getTenantModel = (
  connection,
  institute,
  modelName
) => {
  if (!isTenantModel(modelName)) {
    throw new Error(
      `Model "${modelName}" is not an approved tenant model.`
    );
  }

  const prefix = getTenantCollectionPrefix(institute);
  const modelCache = registeredModelSets.get(connection);
  const models = modelCache?.get(prefix);

  if (!models?.[modelName]) {
    throw new Error(
      `Tenant model "${modelName}" has not been registered. ` +
      "Register the complete tenant model set first."
    );
  }

  return models[modelName];
};
