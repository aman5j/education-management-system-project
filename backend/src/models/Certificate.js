
import mongoose from "mongoose";

const certificateAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "GENERATING",
        "GENERATED",
        "SHARED",
        "REVOKED",
        "GENERATION_FAILED",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  { _id: false }
);

const certificateSchema = new mongoose.Schema(
  {
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
      index: true,
    },

    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },

    exam_result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamResult",
      required: true,
      unique: true,
    },

    certificateNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    verificationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    certificateType: {
      type: String,
      enum: [
        "COURSE_COMPLETION",
        "EXAM_PARTICIPATION",
      ],
      required: true,
    },

    // Student snapshot
    studentNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },

    rollNoSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    studentEmailSnapshot: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    studentPhotoSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    studentSignatureSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    // Course snapshot
    courseNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },

    courseDurationSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    // Published result snapshot
    totalMarksSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    obtainedMarksSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    percentageSnapshot: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    gradeSnapshot: {
      type: String,
      default: "F",
      trim: true,
    },

    passStatusSnapshot: {
      type: String,
      enum: ["Pass", "Fail"],
      required: true,
    },

    resultPublishedAt: {
      type: Date,
      default: null,
    },

    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // PDF generation lifecycle
    generationState: {
      type: String,
      enum: [
        "Generating",
        "Generated",
        "Failed",
      ],
      default: "Generating",
      index: true,
    },

    generationStartedAt: {
      type: Date,
      default: Date.now,
    },

    // Extra add    
    generationToken: {
    type: String,
    default: "",
    select: false,
    },


    generationError: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // Existing business status
    status: {
      type: String,
      enum: [
        "Generated",
        "Shared",
        "Revoked",
      ],
      default: "Generated",
      index: true,
    },

    certificateUrl: {
      type: String,
      default: "",
      trim: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    sharedAt: {
      type: Date,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    auditHistory: {
      type: [certificateAuditSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

certificateSchema.index({
  student_id: 1,
  course_id: 1,
});

certificateSchema.index({
  status: 1,
  issueDate: -1,
});

certificateSchema.index({
  studentNameSnapshot: "text",
  rollNoSnapshot: "text",
  courseNameSnapshot: "text",
  certificateNo: "text",
});

const Certificate = mongoose.model(
  "Certificate",
  certificateSchema
);

export default Certificate;
