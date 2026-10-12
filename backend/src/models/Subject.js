
import mongoose from "mongoose";

const subjectQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 5000,
    },
    optionA: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    optionB: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    optionC: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    optionD: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    correctAnswer: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
    },
  },
  { timestamps: true }
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

    // Optional legacy field for existing records.
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

    // Questions are embedded in Subject.
    // Each MCQ contains exactly the six requested fields.
    questionBank: {
      type: [subjectQuestionSchema],
      default: [],
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
