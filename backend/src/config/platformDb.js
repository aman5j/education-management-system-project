
import mongoose from "mongoose";

let platformConnection = null;
let connectionPromise = null;

const EXPECTED_DATABASE = "ems_platform";

const connectPlatformDB = async () => {
  const mongoUri = process.env.PLATFORM_MONGO_URI;

  if (!mongoUri) {
    throw new Error("PLATFORM_MONGO_URI is required.");
  }

  if (
    platformConnection &&
    platformConnection.readyState === 1
  ) {
    return platformConnection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  platformConnection = mongoose.createConnection(mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });

  connectionPromise = platformConnection
    .asPromise()
    .then((connection) => {
      if (connection.name !== EXPECTED_DATABASE) {
        throw new Error(
          `Platform database must be ${EXPECTED_DATABASE}; received ${connection.name}.`
        );
      }

      console.log(
        `Platform MongoDB connected: ${connection.name}`
      );

      return connection;
    })
    .catch(async (error) => {
      if (platformConnection) {
        await platformConnection.close().catch(() => {});
      }

      platformConnection = null;
      connectionPromise = null;

      throw error;
    });

  return connectionPromise;
};

export const getPlatformConnection = () => {
  if (
    !platformConnection ||
    platformConnection.readyState !== 1
  ) {
    throw new Error("Platform database is not connected.");
  }

  return platformConnection;
};

export default connectPlatformDB;
