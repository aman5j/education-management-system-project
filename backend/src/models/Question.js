
import mongoose from "mongoose";

// const questionOptionSchema = new mongoose.Schema(
//   {
//     optionText: {
//       type: String,
//       required: [true, "Option text is required."],
//       trim: true,
//       maxlength: 500,
//     },
//   },
//   { _id: true }
// );


const questionOptionSchema = new mongoose.Schema(
  {
    optionKey: {
      type: String,
      required: [true, "Option key is required."],
      trim: true,
      maxlength: 80,
    },

    optionText: {
      type: String,
      required: [true, "Option text is required."],
      trim: true,
      maxlength: 500,
    },
  },
  { _id: true }
);


const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required."],
      trim: true,
      minlength: 3,
      maxlength: 5000,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Please select a course."],
      index: true,
    },

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Please select a subject."],
      index: true,
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
      required: true,
      default: "MCQ",
    },

    options: {
      type: [questionOptionSchema],
      default: [],
    },

    // Stores optionKey values for correct answers.
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
      required: true,
    },

    marks: {
      type: Number,
      required: [true, "Marks are required."],
      min: [1, "Marks must be at least 1."],
      max: [1000, "Marks cannot exceed 1000."],
    },

    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Draft",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

questionSchema.index({
  course_id: 1,
  subject_id: 1,
  status: 1,
});

questionSchema.index({
  subject_id: 1,
  questionType: 1,
  difficulty: 1,
});

questionSchema.index({
  createdAt: -1,
});

const Question = mongoose.model("Question", questionSchema);

export default Question;
