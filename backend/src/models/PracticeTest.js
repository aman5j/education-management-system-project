
import mongoose from "mongoose";
import practiceTestSchema from "./schemas/PracticeTest.schema.js";

const PracticeTest =
  mongoose.models.PracticeTest ||
  mongoose.model("PracticeTest", practiceTestSchema);

export default PracticeTest;
