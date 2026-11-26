
import mongoose from "mongoose";
import courseSchema from "./schemas/Course.schema.js";

const Course = mongoose.model(
  "Course",
  courseSchema
);

export default Course;
