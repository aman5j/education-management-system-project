
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    attendance_date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
      default: "Present",
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    marked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per student per date.
attendanceSchema.index(
  {
    student_id: 1,
    attendance_date: 1,
  },
  {
    unique: true,
  }
);

attendanceSchema.index({
  batch_id: 1,
  attendance_date: 1,
});

attendanceSchema.index({
  course_id: 1,
  attendance_date: 1,
});

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

export default Attendance;
