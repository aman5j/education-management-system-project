
import mongoose from "mongoose";

const studyResourceItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 100 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    imageVersion: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 250 },
    buttonText: { type: String, required: true, trim: true, maxlength: 40 },
    buttonUrl: { type: String, required: true, trim: true, maxlength: 500 },
    openInNewTab: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, min: 0 },
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
    items: {
      type: [studyResourceItemSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 8,
        message: "Maximum 8 Study Resource cards are allowed.",
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
