
import {
  TENANT_MODEL_NAMES,
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

let definitionsPromise = null;

/**
 * Loads the existing model files and extracts their Mongoose schemas.
 *
 * Central models such as Institute and PlatformUser are excluded
 * because they are not present in TENANT_MODEL_NAMES.
 */
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

        definitions.push({
          name: modelName,
          schema: model.schema,
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
    // Allow a retry after correcting a missing or invalid model.
    definitionsPromise = null;
    throw error;
  }
};

export const getTenantSchemaLoaderStatus = () => ({
  expectedModels: TENANT_MODEL_NAMES.length,
  loaded: Boolean(definitionsPromise),
});
