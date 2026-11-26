
import mongoose from "mongoose";
import subjectSchema from "./schemas/Subject.schema.js";

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
