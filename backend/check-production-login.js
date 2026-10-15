import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import User from "./src/models/User.js";

import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);


const rl = readline.createInterface({ input: stdin, output: stdout });

try {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Production URI is not configured.");

  await mongoose.connect(uri);

  console.log("Database:", mongoose.connection.db.databaseName);

  const email = (
    await rl.question("Admin email: ")
  ).trim().toLowerCase();

  const password = await rl.question("Password to test: ");

  const user = await User.findOne({ email }).select("+password");

  console.log("USER_FOUND:", Boolean(user));

  if (user) {
    console.log("ROLE:", user.role);
    console.log("STATUS:", user.status);

    const passwordMatches =
      await user.comparePassword(password);

    console.log("PASSWORD_MATCHES:", passwordMatches);
    console.log(
      "LOGIN_ELIGIBLE:",
      user.role === "admin" &&
      user.status === "active" &&
      passwordMatches
    );
  }
} catch (error) {
  console.error("DIAGNOSTIC_ERROR:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await mongoose.disconnect().catch(() => {});
}
