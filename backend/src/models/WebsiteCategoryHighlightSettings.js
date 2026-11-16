import mongoose from "mongoose";

const categoryHighlightItemSchema = new mongoose.Schema(
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
      maxlength: 60,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    iconUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    iconVersion: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const websiteCategoryHighlightSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    items: {
      type: [categoryHighlightItemSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 8,
        message: "Maximum 8 category highlights are allowed.",
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
  "WebsiteCategoryHighlightSettings",
  websiteCategoryHighlightSettingsSchema
);