
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TENANT_MODEL_NAMES,
} from "../config/tenantCollectionRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIRECTORY = path.resolve(
  __dirname,
  "../models"
);

const IMPORT_PATTERN =
  /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']\s*;?/gm;

const DYNAMIC_IMPORT_PATTERN =
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

const GLOBAL_MODEL_PATTERN =
  /\bmongoose\s*\.\s*model\s*\(\s*["']([^"']+)["']/g;

const MONGOOSE_MODELS_PATTERN =
  /\bmongoose\s*\.\s*models\b/g;

const resolveLocalImport = async (sourceFile, specifier) => {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const basePath = path.resolve(
    path.dirname(sourceFile),
    specifier
  );

  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.js"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);

      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
};

const collectImports = (source) => {
  const imports = new Set();

  for (const match of source.matchAll(IMPORT_PATTERN)) {
    imports.add(match[1]);
  }

  for (const match of source.matchAll(DYNAMIC_IMPORT_PATTERN)) {
    imports.add(match[1]);
  }

  return [...imports];
};

const collectGlobalRegistrations = (source) =>
  [...source.matchAll(GLOBAL_MODEL_PATTERN)]
    .map((match) => match[1]);

const inspectDependencyTree = async (entryFile) => {
  const visited = new Set();
  const registrations = new Set();
  const missingImports = new Set();
  const localDependencies = new Set();

  const visit = async (filePath) => {
    if (visited.has(filePath)) return;

    visited.add(filePath);

    let source;

    try {
      source = await fs.readFile(filePath, "utf8");
    } catch (error) {
      missingImports.add(
        `${filePath}: ${error.message}`
      );
      return;
    }

    for (const modelName of collectGlobalRegistrations(source)) {
      registrations.add(modelName);
    }

    const imports = collectImports(source);

    for (const specifier of imports) {
      if (!specifier.startsWith(".")) continue;

      const dependency = await resolveLocalImport(
        filePath,
        specifier
      );

      if (!dependency) {
        missingImports.add(
          `${path.relative(MODELS_DIRECTORY, filePath)} -> ${specifier}`
        );
        continue;
      }

      localDependencies.add(
        path.relative(MODELS_DIRECTORY, dependency)
      );

      await visit(dependency);
    }
  };

  await visit(entryFile);

  return {
    visited,
    registrations,
    missingImports,
    localDependencies,
  };
};

const run = async () => {
  console.log("");
  console.log("EMS TENANT MODEL SIDE-EFFECT AUDIT");
  console.log("Read-only inspection; no database changes.");
  console.log("");

  const reports = [];
  const missingModelFiles = [];

  for (const modelName of TENANT_MODEL_NAMES) {
    const modelFile = path.join(
      MODELS_DIRECTORY,
      `${modelName}.js`
    );

    try {
      await fs.access(modelFile);
    } catch {
      missingModelFiles.push(modelName);
      continue;
    }

    const result = await inspectDependencyTree(modelFile);

    reports.push({
      modelName,
      file: `${modelName}.js`,
      dependencyCount: result.localDependencies.size,
      dependencies: [...result.localDependencies],
      globalRegistrations: [...result.registrations],
      missingImports: [...result.missingImports],
    });
  }

  const directRegistrations = reports.filter(
    (report) =>
      report.globalRegistrations.includes(report.modelName)
  );

  const dependencyRegistrations = reports.filter(
    (report) =>
      report.globalRegistrations.some(
        (name) => name !== report.modelName
      )
  );

  const allRegistrations = new Set();

  for (const report of reports) {
    for (const name of report.globalRegistrations) {
      allRegistrations.add(name);
    }
  }

  console.log("========== SUMMARY ==========");
  console.log(`Registered tenant models: ${TENANT_MODEL_NAMES.length}`);
  console.log(`Model files found:         ${reports.length}`);
  console.log(`Missing model files:       ${missingModelFiles.length}`);
  console.log(`Files registering own model: ${directRegistrations.length}`);
  console.log(`Files importing other model registrations: ${dependencyRegistrations.length}`);
  console.log(`Distinct global registrations found: ${allRegistrations.size}`);
  console.log("=============================");
  console.log("");

  for (const report of reports) {
    console.log(`MODEL: ${report.modelName}`);
    console.log(`File: ${report.file}`);
    console.log(`Local dependency count: ${report.dependencyCount}`);

    if (report.dependencies.length) {
      console.log(
        `Dependencies: ${report.dependencies.join(", ")}`
      );
    }

    if (report.globalRegistrations.length) {
      console.log(
        `Global mongoose.model registrations: ${report.globalRegistrations.join(", ")}`
      );
    } else {
      console.log("Global mongoose.model registrations: none detected");
    }

    if (report.missingImports.length) {
      console.log("Unresolved local imports:");

      for (const item of report.missingImports) {
        console.log(`  - ${item}`);
      }
    }

    console.log("-----------------------------");
  }

  if (missingModelFiles.length) {
    console.log("");
    console.error("Missing tenant model files:", missingModelFiles);
    process.exitCode = 1;
  }

  if (reports.some((report) => report.missingImports.length)) {
    console.log("");
    console.error("Some local dependencies could not be resolved.");
    process.exitCode = 1;
  }

  console.log("");
  console.log(
    "Audit complete. Review this report before changing the schema loader."
  );
};

run().catch((error) => {
  console.error("Tenant model side-effect audit failed:");
  console.error(error);
  process.exitCode = 1;
});
