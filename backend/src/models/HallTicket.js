import mongoose from "mongoose";

const hallTicketSchema = new mongoose.Schema(
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

    hallTicketNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    examDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    reportingTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    status: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

hallTicketSchema.index(
  { exam_id: 1, student_id: 1 },
  { unique: true, name: "unique_exam_student_ticket" }
);

hallTicketSchema.index({ course_id: 1, examDate: 1 });

const HallTicket = mongoose.model("HallTicket", hallTicketSchema);

export default HallTicket;