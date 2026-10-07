import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    // ==========================================
    // ROLL NUMBER
    // ==========================================

    rollNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    // ==========================================
    // PERSONAL INFORMATION
    // ==========================================

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

    // ==========================================
    // CONTACT INFORMATION
    // ==========================================

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

    // ==========================================
    // PROFILE IMAGE
    // ==========================================

    profileImage: {
      type: String,
      default: "",
    },

    // ==========================================
    // SIGNATURE
    // ==========================================

    signature: {
      type: String,
      default: "",
    },

    // ==========================================
    // STUDENT DOCUMENTS
    // ==========================================
    //
    // Multiple documents can be stored for one
    // student.
    //
    // Example:
    // Aadhaar.pdf
    // 10th-MarkSheet.pdf
    // 12th-MarkSheet.pdf
    // Transfer-Certificate.pdf
    //
    // Actual files will be stored on the server
    // or cloud storage later.
    //
    // MongoDB stores only document metadata.
    // ==========================================

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

    // ==========================================
    // COURSE
    // ==========================================

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },

    // ==========================================
    // BATCH
    // ==========================================

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
      index: true,
    },

    // ==========================================
    // STATUS
    // ==========================================

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

    // ==========================================
    // CERTIFICATE OPTIONS
    // ==========================================

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

// ==========================================
// TEXT SEARCH INDEX
// ==========================================

studentSchema.index({
  firstName: "text",
  surname: "text",
  fatherName: "text",
  mobile: "text",
  email: "text",
  rollNo: "text",
});

// ==========================================
// MODEL
// ==========================================

const Student = mongoose.model(
  "Student",
  studentSchema
);

export default Student;