
import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender_role: {
      type: String,
      enum: ["student", "admin"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

supportMessageSchema.index({ ticket_id: 1, createdAt: 1 });

const SupportMessage = mongoose.model(
  "SupportMessage",
  supportMessageSchema
);

export default SupportMessage;
