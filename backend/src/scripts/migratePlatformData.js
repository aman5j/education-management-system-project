
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const SOURCE_DATABASE = "education_management_system";
const TARGET_DATABASE = "ems_platform";

const SOURCE_URI = process.env.MONGO_URI;
const TARGET_URI = process.env.PLATFORM_MONGO_URI;

const COLLECTION_MIGRATIONS = [
  {
    source: "platformusers",
    target: "superadmins",
    uniqueFields: ["email"],
  },
  {
    source: "superadmins",
    target: "superadmins",
    uniqueFields: ["email"],
  },
  {
    source: "institutes",
    target: "institutes",
    uniqueFields: ["slug", "databaseName"],
  },
  {
    source: "domains",
    target: "domains",
    uniqueFields: [],
  },
  {
    source: "plans",
    target: "plans",
    uniqueFields: [],
  },
  {
    source: "subscriptions",
    target: "subscriptions",
    uniqueFields: [],
  },
  {
    source: "provisioninglogs",
    target: "provisioninglogs",
    uniqueFields: [],
  },
  {
    source: "platformauditlogs",
    target: "platformauditlogs",
    uniqueFields: [],
  },
  {
    source: "platformsettings",
    target: "platformsettings",
    uniqueFields: [],
  },
];

const isConfirmed =
  process.env.PLATFORM_MIGRATION_CONFIRM === "YES";

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

const validateConnections = () => {
  if (!SOURCE_URI || !TARGET_URI) {
    throw new Error(
      "Set both MONGO_URI and PLATFORM_MONGO_URI in backend/.env."
    );
  }

  const source = new URL(SOURCE_URI);
  const target = new URL(TARGET_URI);

  if (
    getDatabaseName(SOURCE_URI) !== SOURCE_DATABASE
  ) {
    throw new Error(
      `MONGO_URI must point to ${SOURCE_DATABASE}.`
    );
  }

  if (
    getDatabaseName(TARGET_URI) !== TARGET_DATABASE
  ) {
    throw new Error(
      `PLATFORM_MONGO_URI must point to ${TARGET_DATABASE}.`
    );
  }

  if (
    source.hostname !== target.hostname ||
    source.username !== target.username
  ) {
    throw new Error(
      "Both databases must use the same MongoDB host and database user."
    );
  }
};

const collectionExists = async (db, name) => {
  const cursor = db.listCollections(
    { name },
    { nameOnly: true }
  );

  try {
    return Boolean(await cursor.hasNext());
  } finally {
    await cursor.close();
  }
};

const ensureTargetCollection = async (
  targetDb,
  collectionName
) => {
  if (
    !(await collectionExists(targetDb, collectionName))
  ) {
    await targetDb.createCollection(collectionName);
  }
};

const getUniqueConflict = async (
  target,
  document,
  uniqueFields
) => {
  const conditions = uniqueFields
    .filter(
      (field) =>
        document[field] !== undefined &&
        document[field] !== null &&
        document[field] !== ""
    )
    .map((field) => ({
      [field]: document[field],
    }));

  if (!conditions.length) {
    return null;
  }

  return target.findOne({
    $or: conditions,
  });
};

const copyIndexes = async (
  source,
  target,
  dryRun
) => {
  const indexes = await source.indexes();

  let copied = 0;

  for (const index of indexes) {
    if (index.name === "_id_") {
      continue;
    }

    const options = { ...index };

    delete options.key;
    delete options.name;
    delete options.ns;
    delete options.v;
    delete options.background;

    if (!dryRun) {
      await target.createIndex(
        index.key,
        {
          ...options,
          name: index.name,
        }
      );
    }

    copied++;
  }

  return copied;
};

const migrateCollection = async (
  sourceDb,
  targetDb,
  config,
  dryRun
) => {
  const {
    source: sourceName,
    target: targetName,
    uniqueFields,
  } = config;

  if (
    !(await collectionExists(sourceDb, sourceName))
  ) {
    return {
      sourceName,
      targetName,
      skipped: true,
      sourceCount: 0,
      copied: 0,
      alreadyPresent: 0,
    };
  }

  const source = sourceDb.collection(sourceName);
  const target = targetDb.collection(targetName);

  const sourceCount = await source.countDocuments();

  if (!dryRun) {
    await ensureTargetCollection(
      targetDb,
      targetName
    );
  }

  let copied = 0;
  let alreadyPresent = 0;

  const cursor = source.find({});

  for await (const document of cursor) {
    const existingById = await target.findOne({
      _id: document._id,
    });

    if (existingById) {
      alreadyPresent++;
      continue;
    }

    const conflict = await getUniqueConflict(
      target,
      document,
      uniqueFields
    );

    if (conflict) {
      throw new Error(
        `Unique-value conflict in ${sourceName} -> ${targetName}. ` +
        `A different target document already uses one of its unique values. ` +
        `No existing record was overwritten.`
      );
    }

    if (!dryRun) {
      await target.insertOne(document);
    }

    copied++;
  }

  let indexCount = 0;

  if (!dryRun) {
    indexCount = await copyIndexes(
      source,
      target,
      false
    );
  } else {
    indexCount = (await source.indexes()).filter(
      (item) => item.name !== "_id_"
    ).length;
  }

  return {
    sourceName,
    targetName,
    skipped: false,
    sourceCount,
    copied,
    alreadyPresent,
    indexes: indexCount,
  };
};

const verifyCollection = async (
  sourceDb,
  targetDb,
  config
) => {
  if (
    !(await collectionExists(
      sourceDb,
      config.source
    ))
  ) {
    return true;
  }

  const source = sourceDb.collection(config.source);
  const target = targetDb.collection(config.target);

  const cursor = source.find({});

  for await (const document of cursor) {
    const exists = await target.findOne({
      _id: document._id,
    });

    if (!exists) {
      return false;
    }
  }

  return true;
};

const runMigration = async () => {
  validateConnections();

  let sourceConnection;
  let targetConnection;

  try {
    console.log("");
    console.log("======================================");
    console.log(" EMS CENTRAL PLATFORM DATA MIGRATION");
    console.log("======================================");
    console.log(`Source: ${SOURCE_DATABASE}`);
    console.log(`Target: ${TARGET_DATABASE}`);
    console.log(
      `Mode: ${isConfirmed ? "WRITE / COPY" : "DRY RUN"}`
    );
    console.log("");

    sourceConnection = await mongoose
      .createConnection(SOURCE_URI, {
        serverSelectionTimeoutMS: 15000,
      })
      .asPromise();

    targetConnection = await mongoose
      .createConnection(TARGET_URI, {
        serverSelectionTimeoutMS: 15000,
      })
      .asPromise();

    if (
      sourceConnection.name !== SOURCE_DATABASE ||
      targetConnection.name !== TARGET_DATABASE
    ) {
      throw new Error(
        "Connected database names do not match the expected source and target."
      );
    }

    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;

    const results = [];

    for (const config of COLLECTION_MIGRATIONS) {
      const result = await migrateCollection(
        sourceDb,
        targetDb,
        config,
        !isConfirmed
      );

      results.push(result);

      if (result.skipped) {
        console.log(
          `${result.sourceName}: source collection not found; skipped.`
        );
        continue;
      }

      console.log(
        `${result.sourceName} -> ${result.targetName}`
      );
      console.log(`  Source documents: ${result.sourceCount}`);
      console.log(`  To copy / copied: ${result.copied}`);
      console.log(`  Already present: ${result.alreadyPresent}`);
      console.log(`  Indexes: ${result.indexes}`);
    }

    if (!isConfirmed) {
      console.log("");
      console.log("DRY RUN COMPLETED.");
      console.log(
        "No collections or documents were created, changed or deleted."
      );
      console.log(
        "Review the counts, then set PLATFORM_MIGRATION_CONFIRM=YES to copy."
      );
      return;
    }

    console.log("");
    console.log("Verifying copied records...");

    for (const config of COLLECTION_MIGRATIONS) {
      const verified = await verifyCollection(
        sourceDb,
        targetDb,
        config
      );

      if (!verified) {
        throw new Error(
          `Verification failed for ${config.source} -> ${config.target}.`
        );
      }
    }

    console.log("");
    console.log("======================================");
    console.log(" MIGRATION VERIFIED");
    console.log("======================================");
    console.log(`Central database: ${TARGET_DATABASE}`);
    console.log("Super Admin collection: superadmins");
    console.log("Institute collection: institutes");
    console.log("");
    console.log(
      "Original education_management_system records were NOT deleted."
    );
    console.log(
      "Existing EMS institute collections were NOT modified."
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
  console.error("Platform migration failed:");
  console.error(error.message);
  process.exitCode = 1;
}
