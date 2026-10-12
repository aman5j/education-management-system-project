import mongoose from "mongoose";

const questionOptionSchema = new mongoose.Schema(
  {
    optionKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    optionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const subjectQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 5000,
    },
    topic: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    questionType: {
      type: String,
      enum: [
        "MCQ",
        "Multiple Select",
        "True/False",
        "Short Answer",
        "Long Answer",
      ],
      default: "MCQ",
      required: true,
    },
    options: {
      type: [questionOptionSchema],
      default: [],
    },
    correctAnswers: {
      type: [String],
      default: [],
    },
    expectedAnswer: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    marks: {
      type: Number,
      min: 1,
      max: 1000,
      default: 1,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Draft",
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
