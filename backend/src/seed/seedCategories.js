import dotenv from "dotenv";
import mongoose from "mongoose";

import Category from "../models/Category.js";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);


dotenv.config();

const categories = [
  {
    categoryName:
      "Web Development",
    displayOrder: 1,
  },
  {
    categoryName:
      "Web Designing",
    displayOrder: 2,
  },
  {
    categoryName:
      "Interview Preparation",
    displayOrder: 3,
  },
  {
    categoryName:
      "Source Code Management",
    displayOrder: 4,
  },
  {
    categoryName:
      "Graphic Design",
    displayOrder: 5,
  },
  {
    categoryName:
      "Digital Marketing",
    displayOrder: 6,
  },
  {
    categoryName:
      "Mobile App Development",
    displayOrder: 7,
  },
  {
    categoryName:
      "Data Science",
    displayOrder: 8,
  },
  {
    categoryName:
      "Cloud Computing",
    displayOrder: 9,
  },
  {
    categoryName:
      "Cyber Security",
    displayOrder: 10,
  },
  {
    categoryName:
      "Other",
    displayOrder: 11,
  },
];

const seedCategories =
  async () => {
    try {
      await mongoose.connect(
        // process.env.ATLASDB_URL
        process.env.MONGO_URI
      );

      for (
        const category of categories
      ) {
        await Category.updateOne(
          {
            categoryName:
              category.categoryName,
          },
          {
            $setOnInsert: {
              ...category,
              status:
                "Active",
              categoryIcon:
                "",
            },
          },
          {
            upsert: true,
          }
        );
      }

      console.log(
        "Categories seeded successfully."
      );

      await mongoose.disconnect();

      process.exit(0);
    } catch (error) {
      console.error(
        "Category seed failed:",
        error
      );

      await mongoose.disconnect();

      process.exit(1);
    }
  };

seedCategories();