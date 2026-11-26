
import mongoose from "mongoose";

const bannerSlideSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    imageVersion: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const websiteBannerSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    slides: {
      type: [bannerSlideSchema],
      default: [],
      validate: {
        validator: (slides) => slides.length <= 10,
        message: "Maximum 10 banner slides are allowed.",
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

export default websiteBannerSettingsSchema;
