
import mongoose from "mongoose";

const attemptQuestionSchema = new mongoose.Schema(
  {
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
      select: false,
    },
    selectedAnswer: {
      type: String,
      enum: ["", "A", "B", "C", "D"],
      default: "",
    },
  },
  { _id: false }
);

const practiceAttemptSchema = new mongoose.Schema(
  {
    practiceTest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeTest",
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    questions: {
      type: [attemptQuestionSchema],
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    marksPerQuestion: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    unansweredCount: {
      type: Number,
      default: 0,
    },
    marksObtained: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["In Progress", "Submitted", "Timed Out"],
      default: "In Progress",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

practiceAttemptSchema.index({
  student_id: 1,
  practiceTest_id: 1,
  createdAt: -1,
});

practiceAttemptSchema.index({
  status: 1,
  expiresAt: 1,
});

const PracticeAttempt = mongoose.model(
  "PracticeAttempt",
  practiceAttemptSchema
);

export default PracticeAttempt;
