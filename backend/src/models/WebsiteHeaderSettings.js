import mongoose from "mongoose";

const quickLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      required: true,
      maxlength: 40,
    },
    url: {
      type: String,
      trim: true,
      required: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["Facebook", "Instagram", "YouTube", "LinkedIn", "X"],
      required: true,
    },
    url: {
      type: String,
      trim: true,
      required: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const websiteHeaderSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },

    topbarEnabled: { type: Boolean, default: true },
    announcementText: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    showTopbarEmail: { type: Boolean, default: true },
    showTopbarPhone: { type: Boolean, default: true },

    quickLinks: {
      type: [quickLinkSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 8,
        message: "Maximum 8 quick links are allowed.",
      },
    },

    socialLinks: {
      type: [socialLinkSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 5,
        message: "Maximum 5 social links are allowed.",
      },
    },

    showInstituteLogo: { type: Boolean, default: true },
    showInstituteName: { type: Boolean, default: true },
    logoAlignment: {
      type: String,
      enum: ["left", "center"],
      default: "left",
    },
    headerSticky: { type: Boolean, default: true },

    showLoginButton: { type: Boolean, default: true },
    loginButtonLabel: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "Login",
    },
    loginButtonUrl: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "/login",
    },

    showEnquiryButton: { type: Boolean, default: true },
    enquiryButtonLabel: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "Enquire Now",
    },
    enquiryButtonUrl: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "/contact",
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
  "WebsiteHeaderSettings",
  websiteHeaderSettingsSchema
);