
import mongoose from "mongoose";

const careerJobSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    team: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    employmentType: {
      type: String,
      required: true,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
    },
    workMode: {
      type: String,
      required: true,
      enum: ["On-site", "Remote", "Hybrid"],
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    postedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) =>
          skills.length <= 12 &&
          skills.every((skill) => skill.length <= 50),
        message: "Maximum 12 skills are allowed, with 50 characters each.",
      },
    },
    applyUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const websiteCareerSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    heading: {
      type: String,
      default: "Join Our Growing Team",
      trim: true,
      maxlength: 180,
    },
    highlightText: {
      type: String,
      default: "Team",
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default:
        "Explore exciting career opportunities and be part of the team that's revolutionizing education technology.",
      trim: true,
      maxlength: 600,
    },
    jobs: {
      type: [careerJobSchema],
      default: [],
      validate: {
        validator: (jobs) => jobs.length <= 50,
        message: "Maximum 50 job postings are allowed.",
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model(
  "WebsiteCareerSettings",
  websiteCareerSettingsSchema
);
