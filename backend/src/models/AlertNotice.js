
import mongoose from "mongoose";

const alertNoticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    image: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      default: null,
      index: true,
    },

    audience: {
      type: String,
      enum: ["all"],
      default: "all",
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
  },
  {
    timestamps: true,
  }
);

alertNoticeSchema.index({
  status: 1,
  startAt: 1,
  endAt: 1,
});

export default mongoose.model("AlertNotice", alertNoticeSchema);
