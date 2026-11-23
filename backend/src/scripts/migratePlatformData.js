
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import getPlatformUserModel from "../models/PlatformUser.js";
import getInstituteModel from "../models/Institute.js";

const SOURCE_URI = process.env.LEGACY_PLATFORM_MONGO_URI;
const TARGET_URI = process.env.MONGO_URI;

const SOURCE_DATABASE = "ems_platform";
const TARGET_DATABASE = "education_management_system";

const COLLECTIONS = [
  "platformusers",
  "institutes",
];

const databaseNameFromUri = (uri) => {
  const parsed = new URL(uri);
  return decodeURIComponent(
    parsed.pathname.replace(/^\/+/, "")
  );
};

const migrateCollection = async (
  sourceDb,
  targetDb,
  collectionName
) => {
  const source = sourceDb.collection(collectionName);
  const target = targetDb.collection(collectionName);

  const documents = await source.find({}).toArray();

  if (!documents.length) {
    console.log(`${collectionName}: no source records.`);
    return;
  }

  const toInsert = [];
  let alreadyPresent = 0;

  for (const document of documents) {
    const existingById = await target.findOne({
      _id: document._id,
    });

    if (existingById) {
      alreadyPresent++;
      continue;
    }

    let conflict = null;

    if (
      collectionName === "platformusers" &&
      document.email
    ) {
      conflict = await target.findOne({
        email: document.email,
      });
    }

    if (collectionName === "institutes") {
      const conditions = [];

      if (document.slug) {
        conditions.push({ slug: document.slug });
      }

      if (document.databaseName) {
        conditions.push({
          databaseName: document.databaseName,
        });
      }

      if (conditions.length) {
        conflict = await target.findOne({
          $or: conditions,
        });
      }
    }

    if (conflict) {
      throw new Error(
        `Conflict in ${collectionName}. A different record already uses a unique value. No overwrite was attempted.`
      );
    }

    toInsert.push(document);
  }

  if (toInsert.length) {
    await target.insertMany(toInsert, {
      ordered: true,
    });
  }

  console.log(
    `${collectionName}: copied ${toInsert.length}, already present ${alreadyPresent}.`
  );
};

const run = async () => {
  if (!SOURCE_URI || !TARGET_URI) {
    throw new Error(
      "Set LEGACY_PLATFORM_MONGO_URI and MONGO_URI before migration."
    );
  }

  if (
    databaseNameFromUri(SOURCE_URI) !== SOURCE_DATABASE
  ) {
    throw new Error(
      `Source must be ${SOURCE_DATABASE}.`
    );
  }

  if (
    databaseNameFromUri(TARGET_URI) !== TARGET_DATABASE
  ) {
    throw new Error(
      `Target must be ${TARGET_DATABASE}.`
    );
  }

  if (SOURCE_URI === TARGET_URI) {
    throw new Error(
      "Source and target URIs must be different."
    );
  }

  let sourceConnection;
  let targetConnection;

  try {
    console.log("Connecting to local legacy platform database...");

    sourceConnection = await mongoose
      .createConnection(SOURCE_URI)
      .asPromise();

    console.log(
      `Source connected: ${sourceConnection.name}`
    );

    console.log("Connecting to central Atlas database...");

    targetConnection = await mongoose
      .createConnection(TARGET_URI)
      .asPromise();

    console.log(
      `Target connected: ${targetConnection.name}`
    );

    for (const collectionName of COLLECTIONS) {
      await migrateCollection(
        sourceConnection.db,
        targetConnection.db,
        collectionName
      );
    }

    // Recreate schema indexes on the central database.
    const PlatformUser = getPlatformUserModel(
      targetConnection
    );

    const Institute = getInstituteModel(
      targetConnection
    );

    await PlatformUser.createIndexes();
    await Institute.createIndexes();

    // Verify that the migrated collections can be read.
    const platformUserCount =
      await PlatformUser.countDocuments();

    const instituteCount =
      await Institute.countDocuments();

    console.log("");
    console.log("======================================");
    console.log(" PLATFORM DATA MIGRATION VERIFIED");
    console.log("======================================");
    console.log(
      `Platform users: ${platformUserCount}`
    );
    console.log(
      `Institutes: ${instituteCount}`
    );
    console.log(
      "Target: education_management_system"
    );
    console.log(
      "Source ems_platform was not deleted."
    );
    console.log(
      "Existing EMS collections were not modified."
    );
    console.log("======================================");
  } finally {
    if (sourceConnection) {
      await sourceConnection.close();
    }

    if (targetConnection) {
      await targetConnection.close();
    }
  }
};

try {
  await run();
} catch (error) {
  console.error("Platform migration failed:");
  console.error(error.message);
  process.exitCode = 1;
}
