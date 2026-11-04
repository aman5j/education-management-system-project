
import mongoose from "mongoose";

const assignmentAttachmentSchema = new mongoose.Schema(
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

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: "",
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: 15000,
      default: "",
    },

    // Required audience course.
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // Optional subject. Null means a general course assignment.
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
      index: true,
    },

    // Empty array means all eligible students in the course.
    batch_ids: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Batch",
        },
      ],
      default: [],
    },

    total_marks: {
      type: Number,
      required: true,
      min: 0.01,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    dueAt: {
      type: Date,
      required: true,
      index: true,
    },

    allowLateSubmission: {
      type: Boolean,
      default: false,
    },

    allowResubmission: {
      type: Boolean,
      default: false,
    },

    attachments: {
      type: [assignmentAttachmentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({
  course_id: 1,
  status: 1,
  dueAt: 1,
});

assignmentSchema.index({
  batch_ids: 1,
  status: 1,
});

assignmentSchema.index({
  createdAt: -1,
});

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;
