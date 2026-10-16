
import mongoose from "mongoose";
import {
  ALL_PERMISSION_KEYS,
  STUDENT_PERMISSIONS,
} from "../constants/permissions.js";

const allowedPermissions = [
  ...ALL_PERMISSION_KEYS,
  ...STUDENT_PERMISSIONS,
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
        "Role name can contain lowercase letters, numbers, hyphens and underscores",
      ],
    },

    label: {
      type: String,
      required: [true, "Role label is required"],
      trim: true,
      maxlength: 80,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    // Staff roles are created and managed by Admin.
    // System roles are reserved for application-level roles.
    // Legacy roles are retained temporarily during safe migration.
    roleType: {
      type: String,
      enum: ["staff", "system", "legacy"],
      default: "staff",
      required: true,
    },

    permissions: {
      type: [
        {
          type: String,
          enum: {
            values: allowedPermissions,
            message: "Unknown permission: {VALUE}",
          },
        },
      ],
      default: [],
      validate: {
        validator(permissions) {
          return (
            Array.isArray(permissions) &&
            new Set(permissions).size === permissions.length
          );
        },
        message: "Duplicate permissions are not allowed",
      },
    },

    isSystem: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// System roles cannot be deleted or changed into ordinary staff roles.
// Permission and role changes should still be restricted in the API.
roleSchema.pre("validate", function validateSystemRole(next) {
  if (this.isSystem && this.roleType !== "system") {
    this.invalidate(
      "roleType",
      "System roles must have roleType 'system'"
    );
  }

  if (this.roleType === "system" && !this.isSystem) {
    this.invalidate(
      "isSystem",
      "System roles must set isSystem to true"
    );
  }

  next();
});

const Role = mongoose.model("Role", roleSchema);

export default Role;
