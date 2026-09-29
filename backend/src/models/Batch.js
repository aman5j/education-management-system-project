import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    batch_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    max_seats: {
      type: Number,
      required: true,
      min: 1,
    },

    available_seats: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "Ongoing",
        "Upcoming",
        "Closed",
      ],
      default: "Upcoming",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index({
  course_id: 1,
  batch_name: 1,
});

batchSchema.index({
  batch_name: "text",
});

const Batch = mongoose.model(
  "Batch",
  batchSchema
);

export default Batch;