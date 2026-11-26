
import mongoose from "mongoose";
import studentAdmissionSchema from "./schemas/StudentAdmission.schema.js";

const StudentAdmission =
  mongoose.models.StudentAdmission ||
  mongoose.model("StudentAdmission", studentAdmissionSchema);

export default StudentAdmission;
