
import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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

const websiteTeamSettingsSchema = new mongoose.Schema(
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
      default: "Our Team",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "Team",
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default:
        "We craft solutions that amplify key characteristics, achieving a harmonious balance of function and intent. Through careful analysis and collaborative engagement, our spaces transcend the conventional.",
      trim: true,
      maxlength: 600,
    },
    members: {
      type: [teamMemberSchema],
      default: [],
      validate: {
        validator: (members) => members.length <= 20,
        message: "Maximum 20 team members are allowed.",
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
  "WebsiteTeamSettings",
  websiteTeamSettingsSchema
);
