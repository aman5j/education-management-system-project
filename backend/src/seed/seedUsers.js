import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

import connectDB from "../config/db.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

dotenv.config();

const roles = [
  {
    name: "admin",
    label: "Administrator",
    permissions: [
      "dashboard.view",
      "students.view",
      "students.create",
      "students.update",
      "students.delete",
      "admissions.view",
      "courses.view",
      "courses.create",
      "courses.update",
      "courses.delete",
      "attendance.view",
      "attendance.manage",
      "fees.view",
      "fees.manage",
      "exams.view",
      "exams.manage",
      "results.view",
      "results.manage",
      "certificates.view",
      "certificates.manage",
      "website.view",
      "website.manage",
      "reports.view",
      "settings.manage",
    ],
  },

  {
    name: "website_editor",
    label: "Website Editor",
    permissions: [
      "dashboard.view",
      "website.view",
      "website.manage",
    ],
  },

  {
    name: "student",
    label: "Student",
    permissions: [
      "student.dashboard.view",
      "student.profile.view",
      "student.courses.view",
      "student.attendance.view",
      "student.fees.view",
      "student.exams.view",
      "student.results.view",
      "student.certificates.view",
    ],
  },
];

const users = [
  {
    name: "System Administrator",
    email: "admin@example.com",
    password: "Admin@12345",
    role: "admin",
    status: "active",
  },

  {
    name: "Website Editor",
    email: "websiteeditor@example.com",
    password: "Editor@12345",
    role: "website_editor",
    status: "active",
  },

  {
    name: "Demo Student",
    email: "student@example.com",
    password: "Student@12345",
    role: "student",
    status: "active",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Connected to MongoDB.");

    for (const roleData of roles) {
      await Role.findOneAndUpdate(
        {
          name: roleData.name,
        },
        roleData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log("Roles seeded.");

    for (const userData of users) {
      const existingUser = await User.findOne({
        email: userData.email,
      });

      if (!existingUser) {
        await User.create(userData);

        console.log(
          `Created user: ${userData.email}`
        );
      } else {
        existingUser.name = userData.name;
        existingUser.role = userData.role;
        existingUser.status = userData.status;

        await existingUser.save();

        console.log(
          `Updated user: ${userData.email}`
        );
      }
    }

    console.log("\nSeed completed successfully.");

    console.log("\nDevelopment users:");

    console.log(
      "ADMIN          : admin@example.com / Admin@12345"
    );

    console.log(
      "WEBSITE EDITOR : websiteeditor@example.com / Editor@12345"
    );

    console.log(
      "STUDENT        : student@example.com / Student@12345"
    );

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);

    await mongoose.connection.close();

    process.exit(1);
  }
};

seedDatabase();