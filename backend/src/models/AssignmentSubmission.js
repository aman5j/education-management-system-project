
import mongoose from "mongoose";
import assignmentSubmissionSchema from "./schemas/AssignmentSubmission.schema.js";

const AssignmentSubmission =
  mongoose.models.AssignmentSubmission ||
  mongoose.model(
    "AssignmentSubmission",
    assignmentSubmissionSchema
  );

export default AssignmentSubmission;
