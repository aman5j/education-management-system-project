
import mongoose from "mongoose";
import courseEnquirySchema from "./schemas/CourseEnquiry.schema.js";

const CourseEnquiry =
  mongoose.models.CourseEnquiry ||
  mongoose.model("CourseEnquiry", courseEnquirySchema);

export default CourseEnquiry;
