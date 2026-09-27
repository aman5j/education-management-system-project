import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseTitle: {
      type: String,
      required: true,
      trim: true,
    },

    courseType: {
      type: String,
      required: true,
      trim: true,
    },

    certificateDiploma: {
      type: String,
      trim: true,
      default: "",
    },

    courseCategory: {
      type: String,
      trim: true,
      default: "",
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    durationUnit: {
      type: String,
      enum: [
        "Days",
        "Weeks",
        "Months",
        "Years",
        "Hours",
      ],
      default: "Months",
    },

    courseImage: {
      type: String,
      default: "",
    },

    previewVideo: {
      type: String,
      default: "",
      trim: true,
    },

    totalLectures: {
      type: Number,
      default: 0,
      min: 0,
    },

    practicalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    objectiveMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    syllabus: {
      type: String,
      default: "",
      trim: true,
    },

    eligibility: {
      type: String,
      default: "",
      trim: true,
    },

    certificateSubject: {
      type: String,
      default: "",
      trim: true,
    },

    popular: {
      type: Boolean,
      default: false,
    },

    recommended: {
      type: Boolean,
      default: false,
    },

    mrpVisible: {
      type: Boolean,
      default: true,
    },

    hideExamResult: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "Published",
        "Draft",
        "Archived",
      ],
      default: "Draft",
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({
  courseTitle: "text",
  courseType: "text",
  courseCategory: "text",
});

courseSchema.index({
  status: 1,
});

courseSchema.index({
  courseCategory: 1,
});

courseSchema.index({
  displayOrder: 1,
});

const Course = mongoose.model(
  "Course",
  courseSchema
);

export default Course;