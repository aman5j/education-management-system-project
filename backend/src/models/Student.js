import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
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
      enum: [
        "Male",
        "Female",
        "Other",
        "",
      ],
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
      default: "",
      lowercase: true,
      trim: true,
      maxlength: 150,
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

    /*
     * These two fields support the course/batch
     * filters requested by the specification.
     *
     * They are intentionally optional for Phase 3.
     * Later Course and Batch modules can replace
     * these with proper references.
     */
    course: {
      type: String,
      default: "",
      trim: true,
    },

    batch: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "suspended",
      ],
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

studentSchema.index({
  firstName: "text",
  surname: "text",
  fatherName: "text",
  mobile: "text",
  email: "text",
  rollNo: "text",
});

const Student =
  mongoose.model(
    "Student",
    studentSchema
  );

export default Student;