
import mongoose from "mongoose";

const assignmentEvaluationSchema = new mongoose.Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },

    submission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignmentSubmission",
      required: true,
      index: true,
    },

    submissionVersion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignmentSubmissionVersion",
      required: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },

    feedback: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: "",
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      index: true,
    },

    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Keep one current evaluation record per submission.
// Evaluation history can be added separately if a future requirement
// calls for preserving every revision of marks and feedback.
assignmentEvaluationSchema.index(
  {
    submission_id: 1,
  },
  {
    unique: true,
    name: "unique_submission_evaluation",
  }
);

assignmentEvaluationSchema.index({
  assignment_id: 1,
  status: 1,
});

assignmentEvaluationSchema.index({
  student_id: 1,
  status: 1,
});

const AssignmentEvaluation = mongoose.model(
  "AssignmentEvaluation",
  assignmentEvaluationSchema
);

export default AssignmentEvaluation;
