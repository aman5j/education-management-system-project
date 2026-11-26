
// import mongoose from "mongoose";

// const EXPECTED_DATABASE = "education_management_system";

// const connectPlatformDB = async () => {
//   const mongoUri = process.env.MONGO_URI;

//   if (!mongoUri) {
//     throw new Error("MONGO_URI is required.");
//   }

//   // Reuse the main EMS MongoDB connection.
//   // Connect here as well so standalone seed scripts work.
//   if (mongoose.connection.readyState !== 1) {
//     await mongoose.connect(mongoUri, {
//       serverSelectionTimeoutMS: 15000,
//     });
//   }

//   const connection = mongoose.connection;

//   if (connection.name !== EXPECTED_DATABASE) {
//     throw new Error(
//       `EMS central database must be ${EXPECTED_DATABASE}. ` +
//       `Connected to ${connection.name || "unknown"}.`
//     );
//   }

//   console.log(
//     `Platform and EMS connected to the same database: ${connection.name}`
//   );

//   return connection;
// };

// export const getPlatformConnection = () => {
//   const connection = mongoose.connection;

//   if (
//     connection.readyState !== 1 ||
//     connection.name !== EXPECTED_DATABASE
//   ) {
//     throw new Error(
//       "The central education_management_system database is not connected."
//     );
//   }

//   return connection;
// };

// export default connectPlatformDB;





import mongoose from "mongoose";

const PLATFORM_DATABASE_NAME = "ems_platform";

let platformConnectionPromise = null;

const getMainConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      "The main MongoDB connection must be established first."
    );
  }

  return mongoose.connection;
};

const connectPlatformDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required.");
  }

  const mainConnection = getMainConnection();

  if (!platformConnectionPromise) {
    platformConnectionPromise = Promise.resolve().then(() => {
      const connection = mainConnection.useDb(
        PLATFORM_DATABASE_NAME,
        { useCache: true }
      );

      if (connection.name !== PLATFORM_DATABASE_NAME) {
        throw new Error(
          `Expected ${PLATFORM_DATABASE_NAME}, received ${connection.name}.`
        );
      }

      return connection;
    }).catch((error) => {
      platformConnectionPromise = null;
      throw error;
    });
  }

  const platformConnection = await platformConnectionPromise;

  if (platformConnection.readyState !== 1) {
    throw new Error("Platform database connection is unavailable.");
  }

  console.log(
    `Platform database connected: ${platformConnection.name}`
  );

  return platformConnection;
};

export const getPlatformConnection = () => {
  const mainConnection = getMainConnection();

  const connection = mainConnection.useDb(
    PLATFORM_DATABASE_NAME,
    { useCache: true }
  );

  if (
    connection.readyState !== 1 ||
    connection.name !== PLATFORM_DATABASE_NAME
  ) {
    throw new Error(
      "The ems_platform database is not connected."
    );
  }

  return connection;
};

export default connectPlatformDB;
