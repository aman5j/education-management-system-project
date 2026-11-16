
import mongoose from "mongoose";
import { randomUUID } from "crypto";

const menuItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: () => randomUUID(),
      trim: true,
      required: true,
    },
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
      default: "#",
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    openInNewTab: {
      type: Boolean,
      default: false,
    },
    children: {
      type: [
        new mongoose.Schema(
          {
            key: {
              type: String,
              default: () => randomUUID(),
              trim: true,
              required: true,
            },
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
              default: "#",
            },
            isVisible: {
              type: Boolean,
              default: true,
            },
            openInNewTab: {
              type: Boolean,
              default: false,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
      validate: {
        validator: (items) => items.length <= 15,
        message: "A menu can contain a maximum of 15 submenu items.",
      },
    },
  },
  { _id: false }
);

const websiteMenuSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    items: {
      type: [menuItemSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 25,
        message: "Maximum 25 navigation menu items are allowed.",
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
  "WebsiteMenuSettings",
  websiteMenuSettingsSchema
);
