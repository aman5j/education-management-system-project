import mongoose from "mongoose";

const examAccessRequestSchema = new mongoose.Schema(
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
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HallTicket",
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One access request per student per exam.
examAccessRequestSchema.index(
  { exam_id: 1, student_id: 1 },
  { unique: true, name: "unique_exam_access_request" }
);

examAccessRequestSchema.index({ status: 1, requestedAt: -1 });

const ExamAccessRequest = mongoose.model(
  "ExamAccessRequest",
  examAccessRequestSchema
);

export default ExamAccessRequest;