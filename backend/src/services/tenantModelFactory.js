
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

  if (
    TENANT_MODEL_NAMES.some(
      (name) => ref === getInternalModelName(prefix, name)
    )
  ) {
    return ref;
  }

  const previousReference = ref.match(
    /^([A-Za-z][A-Za-z0-9]*)__(inst_[a-f0-9]{24})$/i
  );

  if (previousReference) {
    const referencedModelName = previousReference[1];

    if (!isTenantModel(referencedModelName)) {
      throw new Error(
        `Unregistered tenant reference "${ref}" in ` +
          `${modelName}.${pathName}.`
      );
    }

    return getInternalModelName(prefix, referencedModelName);
  }

  if (!isTenantModel(ref)) {
    throw new Error(
      `Unregistered reference "${ref}" in ${modelName}.${pathName}.`
    );
  }

  return getInternalModelName(prefix, ref);
};

/**
 * Detach schema type objects from other schema clones.
 *
 * Mongoose schema.clone() can leave nested array reference metadata
 * shared between clones. We explicitly clone each path and its caster
 * before rewriting tenant-specific refs.
 */

const detachSchemaTypes = (schema, visitedSchemas = new Set()) => {
  if (!schema || visitedSchemas.has(schema)) return;

  visitedSchemas.add(schema);

  const cloneSchemaType = (schemaType, pathName) => {
    if (!schemaType || typeof schemaType.clone !== "function") {
      throw new Error(
        `Cannot safely clone schema type for path "${pathName}".`
      );
    }

    const clonedType = schemaType.clone();

    if (clonedType.options) {
      clonedType.options = { ...clonedType.options };
    }

    return clonedType;
  };

  for (const [pathName, originalType] of Object.entries(schema.paths)) {
    if (!originalType || typeof originalType.clone !== "function") {
      throw new Error(
        `Cannot safely clone schema path "${pathName}".`
      );
    }

    const detachedType = cloneSchemaType(originalType, pathName);

    // Detach root path options.
    if (detachedType.options) {
      detachedType.options = { ...detachedType.options };
    }

    // Clone the array caster.
    let detachedCaster = null;

    if (originalType.caster) {
      if (typeof originalType.caster.clone === "function") {
        detachedCaster = cloneSchemaType(
          originalType.caster,
          `${pathName}[]`
        );
        detachedType.caster = detachedCaster;
      } else {
        detachedCaster = detachedType.caster;
      }

      if (detachedCaster?.options) {
        detachedCaster.options = { ...detachedCaster.options };
      }
    }

    // Important:
    // For ordinary Mongoose arrays, $embeddedSchemaType and caster
    // can refer to the same original SchemaType. After cloning the
    // caster, reconnect both properties to the same detached object.
    if (originalType.$embeddedSchemaType) {
      if (
        originalType.$embeddedSchemaType === originalType.caster &&
        detachedCaster
      ) {
        detachedType.$embeddedSchemaType = detachedCaster;
      } else {
        const detachedEmbeddedType = cloneSchemaType(
          originalType.$embeddedSchemaType,
          `${pathName}.$embedded`
        );

        if (detachedEmbeddedType.options) {
          detachedEmbeddedType.options = {
            ...detachedEmbeddedType.options,
          };
        }

        detachedType.$embeddedSchemaType = detachedEmbeddedType;
      }
    }

    // Detach nested document schemas recursively.
    if (detachedType.schema) {
      detachSchemaTypes(detachedType.schema, visitedSchemas);
    }

    if (detachedType.caster?.schema) {
      detachSchemaTypes(
        detachedType.caster.schema,
        visitedSchemas
      );
    }

    if (detachedType.$embeddedSchemaType?.schema) {
      detachSchemaTypes(
        detachedType.$embeddedSchemaType.schema,
        visitedSchemas
      );
    }

    schema.paths[pathName] = detachedType;
  }

  // Detach virtual populate options too.
  for (const virtual of Object.values(schema.virtuals || {})) {
    if (virtual?.options) {
      virtual.options = { ...virtual.options };
    }
  }
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
    if (
      !owner ||
      !Object.prototype.hasOwnProperty.call(owner, key)
    ) {
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
  };

  schema.eachPath((pathName, schemaType) => {
    inspectSchemaType(schemaType, pathName);
  });

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
      throw new Error(
        "Every tenant definition needs a name and schema."
      );
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

  // Prepare every schema before registering any model.
  for (const [name, originalSchema] of definitionMap.entries()) {
    const tenantSchema = originalSchema.clone();

    // Critical: detach mutable path/caster metadata before rewriting refs.
    detachSchemaTypes(tenantSchema);

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
  const models = registeredModelSets.get(connection)?.get(prefix);

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
