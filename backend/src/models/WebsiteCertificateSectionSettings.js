
import mongoose from "mongoose";

const certificateSectionListItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const websiteCertificateSectionSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },

    enabled: {
      type: Boolean,
      default: false,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    imageVersion: {
      type: String,
      default: "",
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },

    highlightText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    listItems: {
      type: [certificateSectionListItemSchema],
      default: [],
    },

    buttonText: {
      type: String,
      default: "View Full Certificate",
      trim: true,
      maxlength: 60,
    },

    buttonAction: {
      type: String,
      enum: ["image", "url"],
      default: "image",
    },

    externalUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
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
  "WebsiteCertificateSectionSettings",
  websiteCertificateSectionSettingsSchema
);
