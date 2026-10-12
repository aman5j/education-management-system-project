import mongoose from "mongoose";

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

    // Optional legacy field for existing records.
    // New subjects do not require a course.
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
