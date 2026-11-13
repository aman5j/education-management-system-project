
import mongoose from "mongoose";

const alertNoticeDismissalSchema = new mongoose.Schema(
  {
    notice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AlertNotice",
      required: true,
    },

    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dismissedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

alertNoticeDismissalSchema.index(
  { notice: 1, studentUser: 1 },
  { unique: true }
);

export default mongoose.model(
  "AlertNoticeDismissal",
  alertNoticeDismissalSchema
);
