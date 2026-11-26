
import mongoose from "mongoose";
import practiceAttemptSchema from "./schemas/PracticeAttempt.schema.js";

const PracticeAttempt =
  mongoose.models.PracticeAttempt ||
  mongoose.model("PracticeAttempt", practiceAttemptSchema);

export default PracticeAttempt;
