
import mongoose from "mongoose";

const examAnswerSchema = new mongoose.Schema(
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
    answer: {
      type: String,
      enum: ["A", "B", "C", "D", ""],
      default: "",
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    marksAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const examResultSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    answers: {
      type: [examAnswerSchema],
      default: [],
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0.01,
    },
    obtainedMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      default: "F",
    },
    passStatus: {
      type: String,
      enum: ["Pass", "Fail"],
      default: "Fail",
    },
    resultStatus: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
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

examResultSchema.index(
  { exam_id: 1, student_id: 1 },
  { unique: true, name: "unique_exam_result_per_student" }
);

examResultSchema.index({ course_id: 1, resultStatus: 1 });

const ExamResult = mongoose.model("ExamResult", examResultSchema);

export default ExamResult;
