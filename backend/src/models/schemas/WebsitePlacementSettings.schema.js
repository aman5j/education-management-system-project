
import mongoose from "mongoose";

const placementStorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 100 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    imageVersion: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    displayOrder: { type: Number, default: 0, min: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    enabled: { type: Boolean, default: true },
    heading: {
      type: String,
      default: "Our Success Placement Story",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "Placement Story",
      trim: true,
      maxlength: 100,
    },
    stories: {
      type: [placementStorySchema],
      default: [],
      validate: {
        validator: (stories) => stories.length <= 20,
        message: "Maximum 20 placement stories are allowed.",
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export default schema;
