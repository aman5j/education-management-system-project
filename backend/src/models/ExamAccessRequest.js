import mongoose from "mongoose";
import examAccessRequestSchema from "./schemas/ExamAccessRequest.schema.js";

const ExamAccessRequest =
  mongoose.models.ExamAccessRequest ||
  mongoose.model("ExamAccessRequest", examAccessRequestSchema);

export default ExamAccessRequest;