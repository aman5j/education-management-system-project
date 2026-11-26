import mongoose from "mongoose";
import assignmentEvaluationSchema from "./schemas/AssignmentEvaluation.schema.js";

const AssignmentEvaluation = mongoose.model(
  "AssignmentEvaluation",
  assignmentEvaluationSchema
);

export default AssignmentEvaluation;