import mongoose from "mongoose";
import studentSchema from "./schemas/Student.schema.js";

const Student = mongoose.model("Student", studentSchema);

export default Student;