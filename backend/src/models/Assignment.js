import mongoose from "mongoose";
import assignmentSchema from "./schemas/Assignment.schema.js";

const Assignment = mongoose.model(
  "Assignment",
  assignmentSchema
);

export default Assignment;