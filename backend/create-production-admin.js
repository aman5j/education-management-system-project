
import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import User from "./src/models/User.js";

import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const rl = readline.createInterface({ input: stdin, output: stdout });

try {
  const uri = process.env.PRODUCTION_MONGODB_URI;

  if (!uri) {
    throw new Error("PRODUCTION_MONGODB_URI is not configured.");
  }

  await mongoose.connect(uri);

  const email = (
    await rl.question("Existing admin email: ")
  ).trim().toLowerCase();

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Admin account not found.");
  }

  if (user.role !== "admin" || user.status !== "active") {
    throw new Error("Account is not an active admin.");
  }

  const password = await rl.question("Enter NEW password: ");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  user.password = password;
  user.refreshTokenHash = null;
  await user.save();

  console.log("Admin password reset successfully.");
  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("Status:", user.status);
} catch (error) {
  console.error("RESET_FAILED:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await mongoose.disconnect().catch(() => {});
}
