
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const platformUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ["super_admin"],
      default: "super_admin",
      immutable: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

platformUserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

platformUserSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

platformUserSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    lastLoginAt: this.lastLoginAt,
  };
};

// Always bind this model to the central platform connection.
const getPlatformUserModel = (connection) => {
  return (
    connection.models.PlatformUser ||
    connection.model("PlatformUser", platformUserSchema)
  );
};

export default getPlatformUserModel;
