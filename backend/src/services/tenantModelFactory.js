
import {
  getTenantCollectionName,
  getTenantCollectionPrefix,
  isTenantModel,
  TENANT_MODEL_NAMES,
  CENTRAL_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

const registeredModelSets = new WeakMap();

const getInternalModelName = (prefix, modelName) =>
  `${modelName}__${prefix}`;

const assertTenantReference = ({
  ref,
  modelName,
  pathName,
  prefix,
}) => {
  if (typeof ref !== "string" || !ref.trim()) {
    throw new Error(
      `Unsupported dynamic reference in ${modelName}.${pathName}.`
    );
  }

  if (CENTRAL_MODEL_NAMES.includes(ref)) {
    throw new Error(
      `Tenant model "${modelName}" references central model "${ref}" ` +
      `at "${pathName}". Central references require explicit review.`
    );
  }

  if (!isTenantModel(ref)) {
    throw new Error(
      `Unregistered reference "${ref}" in ${modelName}.${pathName}.`
    );
  }

  return getInternalModelName(prefix, ref);
};

const rewriteSchemaReferences = (
  schema,
  prefix,
  modelName,
  visitedSchemas = new Set(),
  visitedTypes = new Set()
) => {
  if (!schema || visitedSchemas.has(schema)) return;

  visitedSchemas.add(schema);

  const rewriteReference = (owner, key, pathName) => {
    if (!owner || !Object.prototype.hasOwnProperty.call(owner, key)) {
      return;
    }

    const ref = owner[key];

    if (ref == null) return;

    owner[key] = assertTenantReference({
      ref,
      modelName,
      pathName,
      prefix,
    });
  };

  const inspectSchemaType = (schemaType, pathName) => {
    if (!schemaType || visitedTypes.has(schemaType)) return;

    visitedTypes.add(schemaType);

    const options = schemaType.options || {};

    if (options.refPath || options.refpath) {
      throw new Error(
        `Dynamic refPath in ${modelName}.${pathName} ` +
        "requires an explicit tenant reference implementation."
      );
    }

    rewriteReference(options, "ref", pathName);

    // Array of ObjectIds with ref.
    if (schemaType.caster?.options) {
      const casterOptions = schemaType.caster.options;

      if (casterOptions.refPath || casterOptions.refpath) {
        throw new Error(
          `Dynamic array refPath in ${modelName}.${pathName} is unsupported.`
        );
      }

      rewriteReference(
        casterOptions,
        "ref",
        `${pathName}[]`
      );
    }

    // Mongoose versions may expose the embedded array type here.
    if (schemaType.$embeddedSchemaType?.options) {
      const embeddedOptions =
        schemaType.$embeddedSchemaType.options;

      if (
        embeddedOptions.refPath ||
        embeddedOptions.refpath
      ) {
        throw new Error(
          `Dynamic embedded refPath in ${modelName}.${pathName} is unsupported.`
        );
      }

      rewriteReference(
        embeddedOptions,
        "ref",
        `${pathName}[]`
      );
    }

    // Nested document schemas.
    if (schemaType.schema) {
      rewriteSchemaReferences(
        schemaType.schema,
        prefix,
        modelName,
        visitedSchemas,
        visitedTypes
      );
    }

    if (schemaType.caster?.schema) {
      rewriteSchemaReferences(
        schemaType.caster.schema,
        prefix,
        modelName,
        visitedSchemas,
        visitedTypes
      );
    }

    if (schemaType.$embeddedSchemaType?.schema) {
      rewriteSchemaReferences(
        schemaType.$embeddedSchemaType.schema,
        prefix,
        modelName,
        visitedSchemas,
        visitedTypes
      );
    }
  };

  schema.eachPath((pathName, schemaType) => {
    inspectSchemaType(schemaType, pathName);
  });

  // Virtual populate references.
  for (const [virtualName, virtual] of Object.entries(
    schema.virtuals || {}
  )) {
    const options = virtual?.options || {};

    if (options.refPath || options.refpath) {
      throw new Error(
        `Virtual refPath in ${modelName}.${virtualName} ` +
        "requires an explicit tenant reference implementation."
      );
    }

    rewriteReference(
      options,
      "ref",
      `virtual:${virtualName}`
    );
  }
};

const validateDefinitions = (definitions) => {
  if (!Array.isArray(definitions)) {
    throw new Error("Tenant model definitions must be an array.");
  }

  const definitionMap = new Map();

  for (const definition of definitions) {
    const name = definition?.name;
    const schema = definition?.schema;

    if (!name || !schema) {
      throw new Error("Every tenant definition needs a name and schema.");
    }

    if (!isTenantModel(name)) {
      throw new Error(
        `Model "${name}" is not registered as tenant data.`
      );
    }

    if (definitionMap.has(name)) {
      throw new Error(`Duplicate tenant model definition: ${name}.`);
    }

    definitionMap.set(name, schema);
  }

  const missingModels = TENANT_MODEL_NAMES.filter(
    (name) => !definitionMap.has(name)
  );

  if (missingModels.length) {
    throw new Error(
      `Incomplete tenant model set. Missing: ${missingModels.join(", ")}`
    );
  }

  return definitionMap;
};

/**
 * Register the complete EMS model set for one institute.
 *
 * Each model is registered with:
 * - an internal institute-specific Mongoose model name
 * - an institute-specific MongoDB collection name
 *
 * The original global model schemas are cloned before references
 * are rewritten. Existing global model schemas are not modified.
 */
export const registerTenantModelSet = (
  connection,
  institute,
  definitions
) => {
  if (!connection || connection.readyState !== 1) {
    throw new Error("MongoDB connection is not ready.");
  }

  const prefix = getTenantCollectionPrefix(institute);
  const definitionMap = validateDefinitions(definitions);

  let connectionCache = registeredModelSets.get(connection);

  if (!connectionCache) {
    connectionCache = new Map();
    registeredModelSets.set(connection, connectionCache);
  }

  if (connectionCache.has(prefix)) {
    return connectionCache.get(prefix);
  }

  const prepared = [];

  // Clone and validate every schema before registering any model.
  for (const [name, originalSchema] of definitionMap.entries()) {
    const tenantSchema = originalSchema.clone();
    // Tenant indexes are created explicitly by the initializer.
    // Prevent Mongoose from creating indexes automatically in the background.
    tenantSchema.set("autoIndex", false);

    rewriteSchemaReferences(
      tenantSchema,
      prefix,
      name
    );

    const collectionName = getTenantCollectionName(
      institute,
      name
    );

    const internalName = getInternalModelName(
      prefix,
      name
    );

    const existing = connection.models[internalName];

    if (
      existing &&
      existing.collection.name !== collectionName
    ) {
      throw new Error(
        `Existing model "${internalName}" points to ` +
        `"${existing.collection.name}", expected "${collectionName}".`
      );
    }

    prepared.push({
      name,
      tenantSchema,
      collectionName,
      internalName,
    });
  }

  const models = {};

  for (const item of prepared) {
    const existing = connection.models[item.internalName];

    models[item.name] =
      existing ||
      connection.model(
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
  if (!connection) {
    throw new Error("MongoDB connection is required.");
  }

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
      `Tenant model "${modelName}" has not been registered.`
    );
  }

  return models[modelName];
};

export const getRegisteredTenantModels = (
  connection,
  institute
) => {
  const prefix = getTenantCollectionPrefix(institute);

  return (
    registeredModelSets.get(connection)?.get(prefix) || null
  );
};
