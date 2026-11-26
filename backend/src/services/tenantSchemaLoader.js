import {
  TENANT_MODEL_NAMES,
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

const SCHEMA_ONLY_LOADERS = Object.freeze({
  Course: () =>
    import("../models/schemas/Course.schema.js"),

  Subject: () =>
    import("../models/schemas/Subject.schema.js"),

  Role: () =>
    import("../models/schemas/Role.schema.js"),

  User: () =>
    import("../models/schemas/User.schema.js"),

  Student: () =>
    import("../models/schemas/Student.schema.js"),

  Batch: () =>
    import("../models/schemas/Batch.schema.js"),

  Category: () =>
    import("../models/schemas/Category.schema.js"),

  AlertNotice: () =>
    import("../models/schemas/AlertNotice.schema.js"),

  AlertNoticeDismissal: () =>
    import("../models/schemas/AlertNoticeDismissal.schema.js"),

  Assignment: () =>
    import("../models/schemas/Assignment.schema.js"),

  AssignmentEvaluation: () =>
    import("../models/schemas/AssignmentEvaluation.schema.js"),
});

export const TENANT_SCHEMA_ONLY_MODEL_NAMES =
  Object.freeze(Object.keys(SCHEMA_ONLY_LOADERS));

let definitionsPromise = null;

const loadSchemaOnlyModule = async (modelName) => {
  const loader = SCHEMA_ONLY_LOADERS[modelName];

  if (!loader) {
    return null;
  }

  const schemaModule = await loader();
  const schema = schemaModule.default;

  if (
    !schema ||
    typeof schema.clone !== "function" ||
    typeof schema.eachPath !== "function"
  ) {
    throw new Error(
      `${modelName}: schema-only module must export a Mongoose Schema.`
    );
  }

  return schema;
};

const loadLegacyModelSchema = async (modelName) => {
  const modelModule = await import(
    `../models/${modelName}.js`
  );

  const model = modelModule.default;

  if (!model?.schema) {
    throw new Error(
      "Default export does not contain a Mongoose schema."
    );
  }

  if (model.modelName !== modelName) {
    throw new Error(
      `Expected model name "${modelName}", ` +
      `received "${model.modelName || "unknown"}".`
    );
  }

  return model.schema;
};

export const loadTenantModelDefinitions = async () => {
  if (definitionsPromise) {
    return definitionsPromise;
  }

  definitionsPromise = (async () => {
    const definitions = [];
    const failures = [];

    for (const modelName of TENANT_MODEL_NAMES) {
      if (!isTenantModel(modelName)) {
        failures.push(
          `${modelName}: not registered as a tenant model`
        );
        continue;
      }

      try {
        let schema = await loadSchemaOnlyModule(modelName);

        if (!schema) {
          schema = await loadLegacyModelSchema(modelName);
        }

        definitions.push({
          name: modelName,
          schema,
        });
      } catch (error) {
        failures.push(
          `${modelName}: ${error.message}`
        );
      }
    }

    if (failures.length) {
      throw new Error(
        "Tenant schema loading failed:\n" +
        failures.map((item) => `- ${item}`).join("\n")
      );
    }

    if (definitions.length !== TENANT_MODEL_NAMES.length) {
      throw new Error(
        `Expected ${TENANT_MODEL_NAMES.length} schemas, ` +
        `loaded ${definitions.length}.`
      );
    }

    return definitions;
  })();

  try {
    return await definitionsPromise;
  } catch (error) {
    definitionsPromise = null;
    throw error;
  }
};

export const getTenantSchemaLoaderStatus = () => ({
  expectedModels: TENANT_MODEL_NAMES.length,
  schemaOnlyModels: TENANT_SCHEMA_ONLY_MODEL_NAMES.length,
  schemaOnlyModelNames: [...TENANT_SCHEMA_ONLY_MODEL_NAMES],
  loaded: Boolean(definitionsPromise),
});