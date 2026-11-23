
import mongoose from "mongoose";

const footerLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
    },
    url: {
      type: String,
      trim: true,
      required: true,
      maxlength: 500,
    },
    openInNewTab: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const websiteFooterSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },

    instituteDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "Empowering learners with industry-relevant courses, practical training and career support to build a successful future.",
    },

    columnOneHeading: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "Useful Links",
    },
    columnOneLinks: {
      type: [footerLinkSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 12,
        message: "Maximum 12 links are allowed in Useful Links.",
      },
    },

    columnTwoHeading: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "Our Company",
    },
    columnTwoLinks: {
      type: [footerLinkSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 12,
        message: "Maximum 12 links are allowed in Our Company.",
      },
    },

    columnThreeHeading: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "Get in Touch",
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
  "WebsiteFooterSettings",
  websiteFooterSettingsSchema
);
