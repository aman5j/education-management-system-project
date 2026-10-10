
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
      minlength: [2, "Subject name must contain at least 2 characters"],
      maxlength: [100, "Subject name cannot exceed 100 characters"],
    },

    subjectCode: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Subject code must contain at least 2 characters"],
      maxlength: [30, "Subject code cannot exceed 30 characters"],
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Please select a course"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Subject codes must be unique within a course.
subjectSchema.index(
  { course_id: 1, subjectCode: 1 },
  { unique: true, name: "unique_subject_code_per_course" }
);

// Supports course-based status filtering.
subjectSchema.index(
  { course_id: 1, status: 1 },
  { name: "subject_course_status" }
);

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
