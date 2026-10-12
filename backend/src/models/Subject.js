
import mongoose from "mongoose";

const syllabusTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Topic title is required."],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { _id: true }
);

const syllabusUnitSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Unit title is required."],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    durationHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    topics: {
      type: [syllabusTopicSchema],
      default: [],
    },
  },
  { _id: true }
);

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, "Subject name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    subjectCode: {
      type: String,
      required: [true, "Subject code is required."],
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 30,
      unique: true,
    },

    // Optional legacy field. New subjects do not need a course.
    // Remove this field only after migrating existing records.
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: undefined,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    syllabus: {
      type: [syllabusUnitSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Subject codes are globally unique, not unique per course.
subjectSchema.index(
  { subjectCode: 1 },
  { unique: true, name: "unique_subject_code" }
);

subjectSchema.index(
  { subjectName: 1, status: 1 },
  { name: "subject_name_status" }
);

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
