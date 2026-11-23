
import mongoose from "mongoose";

/**
 * Platform data uses the same default Mongoose connection
 * as the existing EMS application.
 *
 * Main database:
 * education_management_system
 *
 * Collections:
 * platformusers
 * institutes
 */

const EXPECTED_DATABASE = "education_management_system";

const connectPlatformDB = async () => {
  const connection = mongoose.connection;

  if (connection.readyState !== 1) {
    throw new Error(
      "Main EMS MongoDB connection must be established before platform initialization."
    );
  }

  if (connection.name !== EXPECTED_DATABASE) {
    throw new Error(
      `Expected database "${EXPECTED_DATABASE}", but connected to "${connection.name}".`
    );
  }

  console.log(
    `Platform models using shared database: ${connection.name}`
  );

  return connection;
};

export const getPlatformConnection = () => {
  const connection = mongoose.connection;

  if (connection.readyState !== 1) {
    throw new Error("EMS MongoDB connection is not ready.");
  }

  if (connection.name !== EXPECTED_DATABASE) {
    throw new Error(
      `Platform database mismatch. Expected ${EXPECTED_DATABASE}, received ${connection.name}.`
    );
  }

  return connection;
};

export default connectPlatformDB;
