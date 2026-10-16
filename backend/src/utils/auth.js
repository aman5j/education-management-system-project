
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const ROLES = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  STUDENT: "student",

  // Temporary compatibility for existing legacy records only.
  // Do not use this constant when creating new accounts.
  WEBSITE_EDITOR: "website_editor",
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
});

export const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
};

export const createRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const sanitizeAssignedRole = (assignedRole) => {
  if (!assignedRole) {
    return null;
  }

  // When populated, assignedRole is a document containing role data.
  if (typeof assignedRole === "object" && assignedRole._id) {
    return {
      id: assignedRole._id.toString(),
      name: assignedRole.name,
      label: assignedRole.label,
      permissions: Array.isArray(assignedRole.permissions)
        ? assignedRole.permissions
        : [],
      isActive: assignedRole.isActive === true,
    };
  }

  // When not populated, expose only its ID.
  return {
    id: assignedRole.toString(),
  };
};

export const sanitizeUser = (user) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    assignedRole: sanitizeAssignedRole(user.assignedRole),
    studentRecord: user.studentRecord
      ? user.studentRecord._id
        ? user.studentRecord._id.toString()
        : user.studentRecord.toString()
      : null,
    avatar: user.avatar || null,
    phone: user.phone || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
