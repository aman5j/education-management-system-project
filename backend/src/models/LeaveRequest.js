
import mongoose from "mongoose";
import leaveRequestSchema from "./schemas/LeaveRequest.schema.js";

const LeaveRequest =
  mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
