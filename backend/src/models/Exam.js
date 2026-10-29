import mongoose from "mongoose";

const selectedQuestionSchema = new mongoose.Schema(
  {
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }
);

const answerKeyOverrideSchema = new mongoose.Schema(
  {
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);


const examSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Please select a course."],
      index: true,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: [1, "At least one question is required."],
      validate: {
        validator: Number.isInteger,
        message: "Total questions must be a whole number.",
      },
    },

    totalMarks: {
      type: Number,
      required: true,
      min: [0.01, "Total marks must be greater than zero."],
    },

    marksPerQuestion: {
      type: Number,
      required: true,
      min: [0.0001, "Marks per question must be greater than zero."],
    },

    selectedQuestions: {
      type: [selectedQuestionSchema],
      required: true,
      validate: {
        validator(questions) {
          return (
            Array.isArray(questions) &&
            questions.length === this.totalQuestions
          );
        },
        message: "Selected question count must equal total questions.",
      },
    },

    answerKeyOverrides: {
      type: [answerKeyOverrideSchema],
      default: [],
    },


  },
  {
    timestamps: true,
    versionKey: false,
  }
);

examSchema.index({ course_id: 1, createdAt: -1 });

const Exam = mongoose.model("Exam", examSchema);

export default Exam;