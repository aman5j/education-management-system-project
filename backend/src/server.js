
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

import app from "./app.js";
import connectDB from "./config/db.js";
import connectPlatformDB from "./config/platformDb.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect only once to education_management_system.
    await connectDB();

    // Verify the platform uses that same connection.
    await connectPlatformDB();

    app.listen(PORT, () => {
      console.log("");
      console.log("======================================");
      console.log(" Education Management System");
      console.log(" Backend Server");
      console.log("======================================");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(
        `Database: ${process.env.MONGO_URI ? "Connected" : "Not configured"}`
      );
      console.log(
        "Central DB: education_management_system"
      );
      console.log(
        "Platform Super Admin: shared database"
      );
      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );
      console.log("======================================");
      console.log("");
    });
  } catch (error) {
    console.error("Server startup failed:");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
