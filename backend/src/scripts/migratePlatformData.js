
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import getPlatformUserModel from "../models/PlatformUser.js";
import getInstituteModel from "../models/Institute.js";

const SOURCE_DATABASE = "ems_platform";
const TARGET_DATABASE = "education_management_system";

const SOURCE_URI = process.env.LEGACY_PLATFORM_MONGO_URI;
const TARGET_URI = process.env.MONGO_URI;

// Preserve the existing migration while renaming only the
// platformusers collection in the target database.
const COLLECTIONS = [
  {
    sourceName: "platformusers",
    targetName: "superadmins",
    uniqueFields: ["email"],
  },
  {
    sourceName: "institutes",
    targetName: "institutes",
    uniqueFields: ["slug", "databaseName"],
  },
];

const getDatabaseName = (uri) => {
  try {
    const parsed = new URL(uri);

    return decodeURIComponent(
      parsed.pathname.replace(/^\/+/, "")
    );
  } catch {
    throw new Error("Invalid MongoDB connection URI.");
  }
};

const collectionExists = async (db, name) => {
  return db
    .listCollections(
      { name },
      { nameOnly: true }
    )
    .hasNext();
};

const migrateCollection = async (
  sourceDb,
  targetDb,
  config
) => {
  const {
    sourceName,
    targetName,
    uniqueFields,
  } = config;

  const sourceExists = await collectionExists(
    sourceDb,
    sourceName
  );

  if (!sourceExists) {
    console.log(
      `${sourceName}: source collection does not exist; skipped.`
    );

    return {
      sourceName,
      targetName,
      sourceCount: 0,
      copied: 0,
      alreadyPresent: 0,
    };
  }

  const source = sourceDb.collection(sourceName);

  const targetExists = await collectionExists(
    targetDb,
    targetName
  );

  if (!targetExists) {
    await targetDb.createCollection(targetName);
  }

  const target = targetDb.collection(targetName);

  const sourceCount = await source.countDocuments();

  let copied = 0;
  let alreadyPresent = 0;

  const cursor = source.find({});

  for await (const document of cursor) {
    // Preserve original MongoDB document identity.
    const existingById = await target.findOne({
      _id: document._id,
    });

    if (existingById) {
      alreadyPresent++;
      continue;
    }

    // Prevent duplicate email, slug or databaseName conflicts.
    const conditions = uniqueFields
      .filter((field) => document[field] !== undefined)
      .map((field) => ({
        [field]: document[field],
      }));

    if (conditions.length) {
      const conflict = await target.findOne({
        $or: conditions,
      });

      if (conflict) {
        throw new Error(
          `Conflict migrating ${sourceName} to ${targetName}. ` +
          `A different record already uses a unique value. ` +
          `No existing record was overwritten.`
        );
      }
    }

    await target.insertOne(document);
    copied++;
  }

  console.log(
    `${sourceName} -> ${targetName}: ` +
    `copied ${copied}, already present ${alreadyPresent}.`
  );

  return {
    sourceName,
    targetName,
    sourceCount,
    copied,
    alreadyPresent,
  };
};

const runMigration = async () => {
  if (!SOURCE_URI || !TARGET_URI) {
    throw new Error(
      "Set LEGACY_PLATFORM_MONGO_URI and MONGO_URI in backend/.env."
    );
  }

  const sourceDatabaseName = getDatabaseName(SOURCE_URI);
  const targetDatabaseName = getDatabaseName(TARGET_URI);

  if (sourceDatabaseName !== SOURCE_DATABASE) {
    throw new Error(
      `Source database must be ${SOURCE_DATABASE}; ` +
      `received ${sourceDatabaseName}.`
    );
  }

  if (targetDatabaseName !== TARGET_DATABASE) {
    throw new Error(
      `Target database must be ${TARGET_DATABASE}; ` +
      `received ${targetDatabaseName}.`
    );
  }

  if (SOURCE_URI === TARGET_URI) {
    throw new Error(
      "Source and target connection URIs must be different."
    );
  }

  let sourceConnection;
  let targetConnection;

  try {
    console.log("");
    console.log("======================================");
    console.log(" EMS PLATFORM DATA MIGRATION");
    console.log("======================================");
    console.log(`Source database: ${SOURCE_DATABASE}`);
    console.log(`Target database: ${TARGET_DATABASE}`);
    console.log("");

    console.log("Connecting to source database...");

    sourceConnection = await mongoose
      .createConnection(SOURCE_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .asPromise();

    console.log(
      `Source connected: ${sourceConnection.name}`
    );

    console.log("Connecting to target database...");

    targetConnection = await mongoose
      .createConnection(TARGET_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .asPromise();

    console.log(
      `Target connected: ${targetConnection.name}`
    );

    const migrationResults = [];

    for (const config of COLLECTIONS) {
      const result = await migrateCollection(
        sourceConnection.db,
        targetConnection.db,
        config
      );

      migrationResults.push(result);
    }

    // Register models against the target database.
    // PlatformUser must explicitly use the superadmins collection.
    const PlatformUser = getPlatformUserModel(
      targetConnection
    );

    const Institute = getInstituteModel(
      targetConnection
    );

    // Ensure indexes exist on the destination collections.
    await PlatformUser.createIndexes();
    await Institute.createIndexes();

    // Verify destination records through the actual models.
    const [
      superAdminCount,
      instituteCount,
    ] = await Promise.all([
      PlatformUser.countDocuments(),
      Institute.countDocuments(),
    ]);

    const superAdminResult = migrationResults.find(
      (item) => item.targetName === "superadmins"
    );

    const instituteResult = migrationResults.find(
      (item) => item.targetName === "institutes"
    );

    if (
      superAdminResult &&
      superAdminCount <
        superAdminResult.sourceCount
    ) {
      throw new Error(
        "Super Admin migration verification failed. " +
        "The target count is smaller than the source count."
      );
    }

    if (
      instituteResult &&
      instituteCount <
        instituteResult.sourceCount
    ) {
      throw new Error(
        "Institute migration verification failed. " +
        "The target count is smaller than the source count."
      );
    }

    console.log("");
    console.log("======================================");
    console.log(" MIGRATION COMPLETED AND VERIFIED");
    console.log("======================================");
    console.log(`Target database: ${TARGET_DATABASE}`);
    console.log(`Super Admins: ${superAdminCount}`);
    console.log(`Institutes: ${instituteCount}`);
    console.log("");
    console.log("Collection mapping:");

    for (const result of migrationResults) {
      console.log(
        `${result.sourceName} -> ${result.targetName}`
      );
      console.log(
        `  Source records: ${result.sourceCount}`
      );
      console.log(
        `  Copied: ${result.copied}`
      );
      console.log(
        `  Already present: ${result.alreadyPresent}`
      );
    }

    console.log("");
    console.log(
      "Original source collections were NOT deleted."
    );
    console.log(
      "Existing institute and EMS collections were NOT modified."
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
  await runMigration();
} catch (error) {
  console.error("");
  console.error("EMS Platform migration failed:");
  console.error(error.message);
  process.exitCode = 1;
}
