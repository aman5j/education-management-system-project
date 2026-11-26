import mongoose from "mongoose";
import examResultSchema from "./schemas/ExamResult.schema.js";

const ExamResult =
  mongoose.models.ExamResult ||
  mongoose.model("ExamResult", examResultSchema);

export default ExamResult;