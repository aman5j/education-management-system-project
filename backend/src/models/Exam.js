import mongoose from "mongoose";
import examSchema from "./schemas/Exam.schema.js";

const Exam =
  mongoose.models.Exam ||
  mongoose.model("Exam", examSchema);

export default Exam;