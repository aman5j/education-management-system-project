
import mongoose from "mongoose";
import attendanceSchema from "./schemas/Attendance.schema.js";

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

export default Attendance;
