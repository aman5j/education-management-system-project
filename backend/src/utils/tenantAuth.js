
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const TENANT_ISSUER = "ems-tenant";
const TENANT_AUDIENCE = "ems-tenant-user";

const getSecrets = () => {
  const accessSecret = process.env.TENANT_JWT_ACCESS_SECRET;
  const refreshSecret = process.env.TENANT_JWT_REFRESH_SECRET;

  if (
    !accessSecret ||
    accessSecret.length < 32 ||
    !refreshSecret ||
    refreshSecret.length < 32
  ) {
    throw new Error(
      "Tenant JWT secrets must both be configured with at least 32 characters."
    );
  }

  if (accessSecret === refreshSecret) {
    throw new Error(
      "Tenant access and refresh secrets must be different."
    );
  }

  return { accessSecret, refreshSecret };
};

const getTenantClaims = (user, tenantContext) => ({
  sub: user._id.toString(),
  instituteId: tenantContext.instituteId,
  tenantKey: tenantContext.collectionPrefix,
  role: user.role,
});

export const createTenantAccessToken = (
  user,
  tenantContext,
  expiresIn = process.env.TENANT_JWT_ACCESS_EXPIRES_IN || "15m"
) => {
  const { accessSecret } = getSecrets();

  return jwt.sign(
    {
      ...getTenantClaims(user, tenantContext),
      type: "access",
    },
    accessSecret,
    {
      expiresIn,
      issuer: TENANT_ISSUER,
      audience: TENANT_AUDIENCE,
    }
  );
};

export const createTenantRefreshToken = (
  user,
  tenantContext,
  expiresIn = process.env.TENANT_JWT_REFRESH_EXPIRES_IN || "24h"
) => {
  const { refreshSecret } = getSecrets();

  return jwt.sign(
    {
      sub: user._id.toString(),
      instituteId: tenantContext.instituteId,
      tenantKey: tenantContext.collectionPrefix,
      type: "refresh",
    },
    refreshSecret,
    {
      expiresIn,
      issuer: TENANT_ISSUER,
      audience: TENANT_AUDIENCE,
    }
  );
};

export const verifyTenantAccessToken = (token) => {
  const { accessSecret } = getSecrets();

  return jwt.verify(token, accessSecret, {
    issuer: TENANT_ISSUER,
    audience: TENANT_AUDIENCE,
  });
};

export const verifyTenantRefreshToken = (token) => {
  const { refreshSecret } = getSecrets();

  return jwt.verify(token, refreshSecret, {
    issuer: TENANT_ISSUER,
    audience: TENANT_AUDIENCE,
  });
};

export const hashTenantToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const safeTenantHashMatch = (storedHash, token) => {
  if (
    typeof storedHash !== "string" ||
    typeof token !== "string"
  ) {
    return false;
  }

  const incomingHash = hashTenantToken(token);

  const stored = Buffer.from(storedHash, "hex");
  const incoming = Buffer.from(incomingHash, "hex");

  return (
    stored.length === incoming.length &&
    crypto.timingSafeEqual(stored, incoming)
  );
};

const sanitizeAssignedRole = (assignedRole) => {
  if (!assignedRole) return null;

  if (
    typeof assignedRole === "object" &&
    assignedRole._id
  ) {
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

  return {
    id: assignedRole.toString(),
  };
};

export const sanitizeTenantUser = (user) => ({
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
});
