import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    categoryIcon: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      default: "Active",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({
  categoryName: "text",
});

categorySchema.index({
  displayOrder: 1,
});

categorySchema.index({
  status: 1,
});

categorySchema.index(
  {
    categoryName: 1,
  },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

const Category = mongoose.model(
  "Category",
  categorySchema
);

export default Category;