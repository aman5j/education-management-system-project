
import mongoose from "mongoose";

const instituteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },

    // Institute identity
    instituteName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      default: "India Tech Samadhaan",
    },
    legalName: { type: String, trim: true, maxlength: 150, default: "" },
    registrationNumber: { type: String, trim: true, maxlength: 100, default: "" },
    designation: { type: String, trim: true, maxlength: 100, default: "" },

    // Branding
    logoUrl: { type: String, default: "", maxlength: 1000 },
    stampUrl: { type: String, default: "", maxlength: 1000 },

    // Institute contact details
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    phone: { type: String, trim: true, maxlength: 25, default: "" },
    alternatePhone: { type: String, trim: true, maxlength: 25, default: "" },
    website: { type: String, trim: true, maxlength: 300, default: "" },
    addressLine1: { type: String, trim: true, maxlength: 200, default: "" },
    addressLine2: { type: String, trim: true, maxlength: 200, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    state: { type: String, trim: true, maxlength: 100, default: "" },
    postalCode: { type: String, trim: true, maxlength: 20, default: "" },
    country: { type: String, trim: true, maxlength: 100, default: "India" },

    // Examination controller / certificate
    controllerName: { type: String, trim: true, maxlength: 120, default: "" },
    controllerDesignation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Examination Controller",
    },
    controllerEmployeeId: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    controllerEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    controllerPhone: { type: String, trim: true, maxlength: 25, default: "" },
    controllerSignatureUrl: { type: String, default: "", maxlength: 1000 },
    showControllerNameOnCertificate: { type: Boolean, default: true },
    showControllerSignatureOnCertificate: { type: Boolean, default: true },

    // Owner details / certificate
    ownerName: { type: String, trim: true, maxlength: 120, default: "" },
    ownerPhotoUrl: { type: String, default: "", maxlength: 1000 },
    ownerSignatureUrl: { type: String, default: "", maxlength: 1000 },
    showOwnerOnCertificate: { type: Boolean, default: false },

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

const InstituteSettings = mongoose.model(
  "InstituteSettings",
  instituteSettingsSchema
);

export default InstituteSettings;
