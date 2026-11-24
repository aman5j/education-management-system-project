
import {
  loadTenantModelDefinitions,
} from "../services/tenantSchemaLoader.js";

import {
  TENANT_MODEL_NAMES,
  CENTRAL_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

const runAudit = async () => {
  try {
    console.log("Starting EMS tenant schema loader audit...");

    const definitions = await loadTenantModelDefinitions();

    const loadedNames = definitions.map(
      (definition) => definition.name
    );

    const missing = TENANT_MODEL_NAMES.filter(
      (name) => !loadedNames.includes(name)
    );

    const centralIncluded = loadedNames.filter(
      (name) => CENTRAL_MODEL_NAMES.includes(name)
    );

    console.log("");
    console.log("========== TENANT SCHEMA AUDIT ==========");
    console.log(`Expected tenant schemas: ${TENANT_MODEL_NAMES.length}`);
    console.log(`Loaded tenant schemas:   ${definitions.length}`);
    console.log(`Missing schemas:         ${missing.length}`);
    console.log(`Central models included: ${centralIncluded.length}`);

    if (missing.length) {
      console.error("Missing:", missing);
      process.exitCode = 1;
      return;
    }

    if (centralIncluded.length) {
      console.error("Central models found:", centralIncluded);
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log("All tenant schemas loaded successfully.");
    console.log("No database records were modified.");
    console.log("=========================================");
  } catch (error) {
    console.error("Tenant schema audit failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
};

runAudit();
