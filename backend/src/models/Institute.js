
import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    databaseName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    domain: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
      index: true,
    },

    provisioningStatus: {
      type: String,
      enum: ["pending", "provisioning", "ready", "failed"],
      default: "pending",
      index: true,
    },

    provisionedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const getInstituteModel = (connection) => {
  return (
    connection.models.Institute ||
    connection.model("Institute", instituteSchema)
  );
};

export default getInstituteModel;
