import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    surname: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    fatherName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    motherName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    relationship: {
      type: String,
      default: "Father",
      trim: true,
      maxlength: 50,
    },

    dob: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    alternateMobile: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },

    email: {
      type: String,
      required: [true, "Student email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid student email address.",
      ],
    },

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10,
    },

    profileImage: {
      type: String,
      default: "",
    },

    signature: {
      type: String,
      default: "",
    },

    uploadDocument: {
      type: [
        {
          originalName: {
            type: String,
            required: true,
            trim: true,
          },

          fileName: {
            type: String,
            required: true,
            trim: true,
          },

          filePath: {
            type: String,
            required: true,
            trim: true,
          },

          mimeType: {
            type: String,
            required: true,
            trim: true,
          },

          fileSize: {
            type: Number,
            required: true,
            min: 0,
          },

          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    showFatherName: {
      type: Boolean,
      default: true,
    },

    showSurname: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Preserve existing text search index.
studentSchema.index({
  firstName: "text",
  surname: "text",
  fatherName: "text",
  mobile: "text",
  email: "text",
  rollNo: "text",
});

export default studentSchema;