
import mongoose from "mongoose";

const EXPECTED_DATABASE = "education_management_system";

const connectPlatformDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required.");
  }

  // Reuse the main EMS MongoDB connection.
  // Connect here as well so standalone seed scripts work.
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
  }

  const connection = mongoose.connection;

  if (connection.name !== EXPECTED_DATABASE) {
    throw new Error(
      `EMS central database must be ${EXPECTED_DATABASE}. ` +
      `Connected to ${connection.name || "unknown"}.`
    );
  }

  console.log(
    `Platform and EMS connected to the same database: ${connection.name}`
  );

  return connection;
};

export const getPlatformConnection = () => {
  const connection = mongoose.connection;

  if (
    connection.readyState !== 1 ||
    connection.name !== EXPECTED_DATABASE
  ) {
    throw new Error(
      "The central education_management_system database is not connected."
    );
  }

  return connection;
};

export default connectPlatformDB;
