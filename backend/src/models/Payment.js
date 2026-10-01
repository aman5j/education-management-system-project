import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    admission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentAdmission",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    payment_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    payment_mode: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
      ],
      required: true,
    },

    receipt_no: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Verified",
        "Pending",
        "Failed",
        "Overdue",
      ],
      default: "Verified",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({
  student_id: 1,
  admission_id: 1,
});

paymentSchema.index({
  payment_date: -1,
});

paymentSchema.index({
  receipt_no: 1,
});

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);

export default Payment;