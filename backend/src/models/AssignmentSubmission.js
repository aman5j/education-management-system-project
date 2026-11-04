
import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    admission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentAdmission",
      required: true,
    },

    // Latest submitted version.
    latestVersion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignmentSubmissionVersion",
      default: null,
    },

    submissionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    firstSubmittedAt: {
      type: Date,
      default: null,
    },

    lastSubmittedAt: {
      type: Date,
      default: null,
    },

    isLate: {
      type: Boolean,
      default: false,
    },

    // Individual student override controlled by Admin/authorized Staff.
    // The assignment-level policy must also permit resubmission.
    resubmissionEnabled: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Submitted",
        "Late",
        "UnderEvaluation",
        "Evaluated",
      ],
      default: "Pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One tracker per student per assignment.
assignmentSubmissionSchema.index(
  {
    assignment_id: 1,
    student_id: 1,
  },
  {
    unique: true,
    name: "unique_assignment_student_submission",
  }
);

assignmentSubmissionSchema.index({
  assignment_id: 1,
  status: 1,
});

assignmentSubmissionSchema.index({
  student_id: 1,
  status: 1,
});

const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);

export default AssignmentSubmission;
