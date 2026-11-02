
import mongoose from "mongoose";

const supportCounterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const SupportCounter = mongoose.model(
  "SupportCounter",
  supportCounterSchema
);

export default SupportCounter;
