
import dotenv from "dotenv";

dotenv.config();

import connectPlatformDB, {
  getPlatformConnection,
} from "../config/platformDb.js";

import getPlatformUserModel from "../models/PlatformUser.js";

const seedPlatformAdmin = async () => {
  const email = (
    process.env.PLATFORM_ADMIN_EMAIL ||
    "amanprajapati190@gmail.com"
  )
    .trim()
    .toLowerCase();

  const name =
    process.env.PLATFORM_ADMIN_NAME ||
    "Platform Super Admin";

  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Set PLATFORM_ADMIN_PASSWORD in your backend .env file before running this script."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "Platform Super Admin password must contain at least 12 characters."
    );
  }

  await connectPlatformDB();

  const connection = getPlatformConnection();
  const PlatformUser = getPlatformUserModel(connection);

  const existingUser = await PlatformUser.findOne({ email });

  if (existingUser) {
    console.log(
      `Platform Super Admin already exists: ${email}`
    );
    console.log(
      "No changes were made to the existing account."
    );
    return;
  }

  const user = await PlatformUser.create({
    name,
    email,
    password,
    role: "super_admin",
    status: "active",
  });

  console.log("");
  console.log("======================================");
  console.log(" Platform Super Admin created");
  console.log("======================================");
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Status: ${user.status}`);
  console.log("Password: securely hashed in MongoDB");
  console.log("======================================");
};

try {
  await seedPlatformAdmin();
} catch (error) {
  console.error("Platform Super Admin setup failed:");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    const connection = getPlatformConnection();
    await connection.close();
  } catch {
    // Connection may not have been established.
  }
}
