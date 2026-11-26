
import mongoose from "mongoose";
import assignmentSubmissionVersionSchema from "./schemas/AssignmentSubmissionVersion.schema.js";

const AssignmentSubmissionVersion =
  mongoose.models.AssignmentSubmissionVersion ||
  mongoose.model(
    "AssignmentSubmissionVersion",
    assignmentSubmissionVersionSchema
  );

export default AssignmentSubmissionVersion;
