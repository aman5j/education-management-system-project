import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("");
      console.log("======================================");
      console.log(" Education Management System");
      console.log(" Backend Server");
      console.log("======================================");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
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