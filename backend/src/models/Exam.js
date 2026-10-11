
import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, "Exam name is required."],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Please select a course."],
      index: true,
    },

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Please select a batch."],
      index: true,
    },

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Please select a subject."],
      index: true,
    },

    examType: {
      type: String,
      enum: ["Theory", "Practical", "Oral", "Online"],
      default: "Theory",
      required: true,
    },

    examDate: {
      type: Date,
      required: [true, "Exam date is required."],
    },

    startTime: {
      type: String,
      required: [true, "Start time is required."],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format."],
    },

    endTime: {
      type: String,
      required: [true, "End time is required."],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format."],
    },

    durationMinutes: {
      type: Number,
      required: [true, "Exam duration is required."],
      min: [1, "Duration must be at least one minute."],
      max: [1440, "Duration cannot exceed 24 hours."],
    },

    totalMarks: {
      type: Number,
      required: [true, "Total marks are required."],
      min: [1, "Total marks must be greater than zero."],
    },

    passingMarks: {
      type: Number,
      required: [true, "Passing marks are required."],
      min: [0, "Passing marks cannot be negative."],
    },

    room: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

examSchema.index({
  course_id: 1,
  batch_id: 1,
  examDate: 1,
});

examSchema.index({
  subject_id: 1,
  examDate: 1,
});

examSchema.pre("validate", function (next) {
  if (
    this.startTime &&
    this.endTime &&
    this.startTime >= this.endTime
  ) {
    this.invalidate(
      "endTime",
      "End time must be later than start time."
    );
  }

  if (
    this.totalMarks != null &&
    this.passingMarks != null &&
    this.passingMarks > this.totalMarks
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks cannot exceed total marks."
    );
  }

  next();
});

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
