
import mongoose from "mongoose";

const courseEnquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    preparingFor: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    enquiryType: {
      type: String,
      enum: ["Course", "General"],
      default: "General",
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    courseTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    message: {
      type: String,
      required: [true, "Message is required."],
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["New", "Contacted", "Closed"],
      default: "New",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseEnquirySchema.index({ createdAt: -1 });
courseEnquirySchema.index({ email: 1 });

export default mongoose.model(
  "CourseEnquiry",
  courseEnquirySchema
);
