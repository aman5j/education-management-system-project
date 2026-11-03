
import mongoose from "mongoose";

const practiceTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 300,
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

practiceTestSchema.index({
  course_id: 1,
  subject_id: 1,
  status: 1,
  createdAt: -1,
});

const PracticeTest = mongoose.model(
  "PracticeTest",
  practiceTestSchema
);

export default PracticeTest;
