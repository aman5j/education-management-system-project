
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    selectedCategoryIds: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      }],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export default schema;
