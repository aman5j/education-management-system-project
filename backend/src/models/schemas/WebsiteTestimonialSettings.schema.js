
import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 100 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 1000 },
    imageVersion: { type: String, default: "", trim: true, maxlength: 100 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, required: true, trim: true, maxlength: 120 },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5.",
      },
    },
    review: { type: String, required: true, trim: true, maxlength: 1500 },
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
    sectionLabel: {
      type: String,
      default: "Testimonials",
      trim: true,
      maxlength: 80,
    },
    heading: {
      type: String,
      default: "What Our Students Say",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "Students Say",
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default:
        "Hear from our students about their learning experience and journey with us.",
      trim: true,
      maxlength: 600,
    },
    testimonials: {
      type: [testimonialSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 50,
        message: "Maximum 50 testimonials are allowed.",
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
