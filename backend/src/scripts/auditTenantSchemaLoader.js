
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

    // This script runs in a fresh Node process.
    const courseWasAlreadyRegistered = Boolean(
      mongoose.models.Course
    );

    if (courseWasAlreadyRegistered) {
      throw new Error(
        "Course was registered globally before the tenant schema audit began."
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

    const courseGloballyRegistered = Boolean(
      mongoose.models.Course
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
      `Course globally registered by loader: ${courseGloballyRegistered ? "YES" : "NO"}`
    );

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

    if (courseGloballyRegistered) {
      console.error(
        "FAIL: Loading tenant definitions registered Course globally."
      );
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log("All tenant schemas loaded successfully.");
    console.log("Course schema-only loading verified.");
    console.log("No database records were modified.");
    console.log("=========================================");
  } catch (error) {
    console.error("Tenant schema audit failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
};

runAudit();
