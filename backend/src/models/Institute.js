
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

    /**
     * LEGACY FIELD
     *
     * Retained so existing institute records and current UI/API
     * continue working during the transition.
     *
     * It must NOT be used to connect to a separate MongoDB database.
     * The platform and all institute collections use the central
     * education_management_system database.
     */
    databaseName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    /**
     * Internal collection namespace.
     *
     * Generated from the institute ObjectId:
     * inst_<24-character-object-id>
     *
     * Never accept this value from the browser.
     */
    collectionPrefix: {
      type: String,
      trim: true,
      immutable: true,
      match: /^inst_[a-f0-9]{24}$/i,
    },

    tenantSchemaVersion: {
      type: Number,
      default: 1,
      min: 1,
    },

    tenantInitializedAt: {
      type: Date,
      default: null,
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

/**
 * Backward-compatible prefix generation.
 *
 * Existing documents receive a prefix when they are next saved.
 * This hook does not bulk-update or rewrite existing records.
 */
instituteSchema.pre("validate", function () {
  if (!this.collectionPrefix && this._id) {
    this.collectionPrefix = `inst_${String(this._id).toLowerCase()}`;
  }

  if (this.collectionPrefix && this._id) {
    const expected = `inst_${String(this._id).toLowerCase()}`;

    if (this.collectionPrefix !== expected) {
      this.invalidate(
        "collectionPrefix",
        "Collection prefix must match the institute ID."
      );
    }
  }
});

const getInstituteModel = (connection) => {
  return (
    connection.models.Institute ||
    connection.model("Institute", instituteSchema)
  );
};

export default getInstituteModel;
