
import mongoose from "mongoose";

const SUPPORT_CATEGORIES = [
  "Academic Query",
  "General Inquiry",
  "Technical Issue",
  "Fees & Payments",
  "Examination",
  "Attendance",
  "Other",
];

const SUPPORT_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const SUPPORT_STATUSES = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    category: {
      type: String,
      enum: SUPPORT_CATEGORIES,
      required: true,
    },

    priority: {
      type: String,
      enum: SUPPORT_PRIORITIES,
      default: "Medium",
      index: true,
    },

    status: {
      type: String,
      enum: SUPPORT_STATUSES,
      default: "Open",
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    reopenedAt: {
      type: Date,
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ student_id: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ category: 1, createdAt: -1 });

const SupportTicket = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);

export {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
};

export default SupportTicket;
