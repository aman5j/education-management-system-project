import mongoose from "mongoose";

const studentAdmissionSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    course_type: {
      type: String,
      trim: true,
      default: "",
    },

    course_fee: {
      type: Number,
      required: true,
      min: 0,
    },

    discount_type: {
      type: String,
      enum: ["Amount", "Percentage"],
      default: "Amount",
    },

    discount_value: {
      type: Number,
      default: 0,
      min: 0,
    },

    is_gst_taken: {
      type: Boolean,
      default: false,
    },

    gst_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    final_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    admission_fee: {
      type: Number,
      default: 0,
      min: 0,
    },

    paid_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    admission_date: {
      type: Date,
      required: true,
      index: true,
    },

    referral_source: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "Dropped"],
      default: "Active",
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

/*
|--------------------------------------------------------------------------
| Remaining Amount Virtual
|--------------------------------------------------------------------------
|
| remaining_amount = final_amount - paid_amount
|
*/

studentAdmissionSchema.virtual("remaining_amount").get(function () {
  return Math.max(
    0,
    Number(this.final_amount || 0) -
      Number(this.paid_amount || 0)
  );
});

studentAdmissionSchema.set("toJSON", {
  virtuals: true,
});

studentAdmissionSchema.set("toObject", {
  virtuals: true,
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

studentAdmissionSchema.index({
  admission_date: -1,
  status: 1,
});

studentAdmissionSchema.index({
  student_id: 1,
});

studentAdmissionSchema.index({
  course_id: 1,
});

studentAdmissionSchema.index({
  batch_id: 1,
});

const StudentAdmission = mongoose.model(
  "StudentAdmission",
  studentAdmissionSchema
);

export default StudentAdmission;