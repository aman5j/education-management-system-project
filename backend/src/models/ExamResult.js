
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

    questionTextSnapshot: {
      type: String,
      default: "",
    },

    subjectNameSnapshot: {
      type: String,
      default: "",
    },

    optionASnapshot: {
      type: String,
      default: "",
    },

    optionBSnapshot: {
      type: String,
      default: "",
    },

    optionCSnapshot: {
      type: String,
      default: "",
    },

    optionDSnapshot: {
      type: String,
      default: "",
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

    correctAnswerSnapshot: {
      type: String,
      enum: ["A", "B", "C", "D", ""],
      default: "",
    },
    marksOverridden: {
      type: Boolean,
      default: false,
    },
    overrideReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },

  { _id: false }
);


const resultAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "UNPUBLISHED",
        "MARKS_OVERRIDDEN",
        "ANSWER_KEY_RECALCULATED",
        "REPUBLISHED",
        "ADMIN_FINAL_RESULT_UPDATED",
      ],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000,
    },
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
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

    auditHistory: {
      type: [resultAuditSchema],
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

    // Institute-controlled final marks breakdown
    objectiveTotalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    objectiveObtainedMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    practicalTotalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    practicalObtainedMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Original automatic score, retained when Admin edits final marks
    autoCalculatedMarks: {
      type: Number,
      default: null,
      min: 0,
    },
    autoCalculatedPercentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    adminMarksUpdatedAt: {
      type: Date,
      default: null,
    },
    adminMarksUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

    // Online exam attempt tracking for the Student Portal.
    attemptStatus: {
      type: String,
      enum: ["NotStarted", "InProgress", "Submitted"],
      default: "NotStarted",
      index: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
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
