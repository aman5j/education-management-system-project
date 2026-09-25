import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["admin", "website_editor", "student"],
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model("Role", roleSchema);

export default Role;