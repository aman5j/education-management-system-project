
import mongoose from "mongoose";

const submissionFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const assignmentSubmissionVersionSchema = new mongoose.Schema(
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

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    files: {
      type: [submissionFileSchema],
      required: true,
      validate: {
        validator: (files) =>
          Array.isArray(files) && files.length > 0,
        message: "At least one submission file is required.",
      },
    },

    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    isLate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSubmissionVersionSchema.index(
  {
    submission_id: 1,
    versionNumber: 1,
  },
  {
    unique: true,
    name: "unique_submission_version_number",
  }
);

assignmentSubmissionVersionSchema.index({
  assignment_id: 1,
  student_id: 1,
  submittedAt: -1,
});

const AssignmentSubmissionVersion = mongoose.model(
  "AssignmentSubmissionVersion",
  assignmentSubmissionVersionSchema
);

export default AssignmentSubmissionVersion;
