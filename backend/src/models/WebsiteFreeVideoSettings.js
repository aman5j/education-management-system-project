
import mongoose from "mongoose";

const freeVideoSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    videoId: {
      type: String,
      required: true,
      trim: true,
      match: /^[A-Za-z0-9_-]{11}$/,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const websiteFreeVideoSettingsSchema = new mongoose.Schema(
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
      default: "Free Videos",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "Videos",
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default:
        "Watch our most popular and high-quality free videos to boost your learning journey.",
      trim: true,
      maxlength: 600,
    },
    videos: {
      type: [freeVideoSchema],
      default: [],
      validate: {
        validator: (videos) => videos.length <= 20,
        message: "Maximum 20 free videos are allowed.",
      },
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

export default mongoose.model(
  "WebsiteFreeVideoSettings",
  websiteFreeVideoSettingsSchema
);
