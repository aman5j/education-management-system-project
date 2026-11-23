
import mongoose from "mongoose";

let platformConnection;
let connectionPromise;

const connectPlatformDB = async () => {
  const mongoUri = process.env.PLATFORM_MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "PLATFORM_MONGO_URI is required for the central platform database."
    );
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
    serverSelectionTimeoutMS: 10000,
  });

  connectionPromise = platformConnection.asPromise()
    .then((connection) => {
      console.log(
        `Platform MongoDB connected: ${connection.name}`
      );

      return connection;
    })
    .catch((error) => {
      platformConnection = null;
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

export const getPlatformConnection = () => {
  if (!platformConnection || platformConnection.readyState !== 1) {
    throw new Error(
      "Platform database is not connected."
    );
  }

  return platformConnection;
};

export default connectPlatformDB;
