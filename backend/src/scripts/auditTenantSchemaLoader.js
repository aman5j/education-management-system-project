
import mongoose from "mongoose";

import {
  loadTenantModelDefinitions,
  TENANT_SCHEMA_ONLY_MODEL_NAMES,
} from "../services/tenantSchemaLoader.js";

import {
  TENANT_MODEL_NAMES,
  CENTRAL_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

const runAudit = async () => {
  try {
    console.log("Starting EMS tenant schema loader audit...");

    // This audit must run in a fresh Node process.
    const registeredBeforeLoading =
      TENANT_SCHEMA_ONLY_MODEL_NAMES.filter(
        (name) => Boolean(mongoose.models[name])
      );

    if (registeredBeforeLoading.length) {
      throw new Error(
        "Schema-only models were already globally registered before loading: " +
        registeredBeforeLoading.join(", ")
      );
    }

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

    const globallyRegisteredAfterLoading =
      TENANT_SCHEMA_ONLY_MODEL_NAMES.filter(
        (name) => Boolean(mongoose.models[name])
      );

    console.log("");
    console.log("========== TENANT SCHEMA AUDIT ==========");
    console.log(`Expected tenant schemas: ${TENANT_MODEL_NAMES.length}`);
    console.log(`Loaded tenant schemas:   ${definitions.length}`);
    console.log(`Missing schemas:         ${missing.length}`);
    console.log(`Central models included: ${centralIncluded.length}`);
    console.log(
      `Schema-only models:      ${TENANT_SCHEMA_ONLY_MODEL_NAMES.length}`
    );

    console.log(
      "Schema-only model names:",
      TENANT_SCHEMA_ONLY_MODEL_NAMES.join(", ")
    );

    console.log(
      "Globally registered after loading:",
      globallyRegisteredAfterLoading.length
        ? globallyRegisteredAfterLoading.join(", ")
        : "NONE"
    );

    if (missing.length) {
      console.error("Missing schemas:", missing);
      process.exitCode = 1;
      return;
    }

    if (centralIncluded.length) {
      console.error("Central models found:", centralIncluded);
      process.exitCode = 1;
      return;
    }

    if (globallyRegisteredAfterLoading.length) {
      console.error(
        "FAIL: Schema-only modules registered global models."
      );
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log("All tenant schemas loaded successfully.");
    console.log("All extracted schemas passed global registration checks.");
    console.log("No database records were modified.");
    console.log("=========================================");
  } catch (error) {
    console.error("Tenant schema audit failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
};

runAudit();
