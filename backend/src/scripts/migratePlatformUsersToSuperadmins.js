
import dotenv from "dotenv";
import mongoose from "mongoose";

import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);


dotenv.config();

import getPlatformUserModel from "../models/PlatformUser.js";

const DATABASE_NAME = "education_management_system";
const SOURCE_COLLECTION = "platformusers";
const TARGET_COLLECTION = "superadmins";

const collectionExists = async (db, name) => {
  const result = await db
    .listCollections(
      { name },
      { nameOnly: true }
    )
    .hasNext();

  return result;
};

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from backend/.env.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const db = mongoose.connection.db;

  if (mongoose.connection.name !== DATABASE_NAME) {
    throw new Error(
      `Expected ${DATABASE_NAME}, connected to ${mongoose.connection.name}.`
    );
  }

  console.log(`Connected to ${DATABASE_NAME}`);

  const sourceExists = await collectionExists(
    db,
    SOURCE_COLLECTION
  );

  const targetExists = await collectionExists(
    db,
    TARGET_COLLECTION
  );

  if (!sourceExists && !targetExists) {
    throw new Error(
      "Neither platformusers nor superadmins collection exists. Nothing to migrate."
    );
  }

  if (!targetExists) {
    await db.createCollection(TARGET_COLLECTION);
  }

  const source = db.collection(SOURCE_COLLECTION);
  const target = db.collection(TARGET_COLLECTION);

  const sourceCount = sourceExists
    ? await source.countDocuments()
    : 0;

  let copied = 0;
  let alreadyPresent = 0;

  if (sourceExists) {
    const cursor = source.find({});

    for await (const document of cursor) {
      const existingById = await target.findOne({
        _id: document._id,
      });

      if (existingById) {
        alreadyPresent++;
        continue;
      }

      if (document.email) {
        const existingByEmail = await target.findOne({
          email: document.email,
        });

        if (existingByEmail) {
          throw new Error(
            `Email conflict for ${document.email}. No existing record was overwritten.`
          );
        }
      }

      await target.insertOne(document);
      copied++;
    }
  }

  // Register and verify the unique email index on superadmins.
  const PlatformUser = getPlatformUserModel(
    mongoose.connection
  );

  await PlatformUser.createIndexes();

  // Verify every source record is represented in the target.
  if (sourceExists) {
    const verifyCursor = source.find({});

    for await (const document of verifyCursor) {
      const migrated = await target.findOne({
        _id: document._id,
      });

      if (!migrated) {
        throw new Error(
          `Verification failed for Super Admin record ${document._id}.`
        );
      }
    }
  }

  const targetCount = await target.countDocuments();

  console.log("");
  console.log("======================================");
  console.log(" SUPER ADMIN COLLECTION MIGRATION");
  console.log("======================================");
  console.log(`Database: ${DATABASE_NAME}`);
  console.log(`Source: ${SOURCE_COLLECTION}`);
  console.log(`Target: ${TARGET_COLLECTION}`);
  console.log(`Source records: ${sourceCount}`);
  console.log(`Copied: ${copied}`);
  console.log(`Already present: ${alreadyPresent}`);
  console.log(`Target records: ${targetCount}`);
  console.log("Verification: successful");
  console.log("");
  console.log(
    "Original platformusers collection was NOT deleted."
  );
  console.log(
    "Existing institute and EMS collections were NOT modified."
  );
  console.log("======================================");
};

try {
  await migrate();
} catch (error) {
  console.error("Super Admin collection migration failed:");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
