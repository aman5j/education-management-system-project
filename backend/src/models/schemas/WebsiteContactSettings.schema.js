
import mongoose from "mongoose";

const websiteContactSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    heading: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Get in Touch",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "Have a question? Send us a message and our team will help you.",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default websiteContactSettingsSchema;
