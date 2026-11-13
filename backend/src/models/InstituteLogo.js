
import mongoose from "mongoose";

const instituteLogoSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp"],
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      required: true,
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

export default mongoose.model("InstituteLogo", instituteLogoSchema);
