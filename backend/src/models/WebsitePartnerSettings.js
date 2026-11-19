
import mongoose from "mongoose";

const websitePartnerLogoSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
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
      maxlength: 100,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const websitePartnerSettingsSchema = new mongoose.Schema(
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
      default: "Trusted by industry leaders and valued partners worldwide",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "industry leaders and valued partners",
      trim: true,
      maxlength: 100,
    },
    visibleCount: {
      type: Number,
      default: 5,
      min: 1,
      max: 8,
    },
    autoSlide: {
      type: Boolean,
      default: true,
    },
    logos: {
      type: [websitePartnerLogoSchema],
      default: [],
      validate: {
        validator: (logos) => logos.length <= 20,
        message: "Maximum 20 partner logos are allowed.",
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
  "WebsitePartnerSettings",
  websitePartnerSettingsSchema
);
