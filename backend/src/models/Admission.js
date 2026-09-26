import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    // Roll number is inherited from Student.
    // It is intentionally NOT generated again here.
    rollNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    courseType: {
      type: String,
      trim: true,
      default: "",
    },

    course: {
      type: String,
      trim: true,
      default: "",
    },

    courseFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["amount", "percentage"],
      default: "amount",
    },

    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    admissionFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    finalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    admissionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    batch: {
      type: String,
      trim: true,
      default: "",
    },

    availableSeats: {
      type: Number,
      min: 0,
      default: 0,
    },

    referralBy: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
      default: "active",
      index: true,
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

admissionSchema.index({
  rollNo: 1,
  course: 1,
  batch: 1,
});

admissionSchema.index({
  admissionDate: -1,
});

const Admission = mongoose.model(
  "Admission",
  admissionSchema
);

export default Admission;