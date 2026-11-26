
import {
  verifyTenantAccessToken,
  sanitizeTenantUser,
} from "../utils/tenantAuth.js";

export const authenticateTenant = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      success: false,
      code: "TENANT_AUTH_REQUIRED",
      message: "Institute authentication is required.",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      code: "TENANT_AUTH_REQUIRED",
      message: "Institute authentication is required.",
    });
  }

  if (
    !req.tenantContext?.instituteId ||
    !req.tenantContext?.collectionPrefix ||
    typeof req.getTenantModel !== "function"
  ) {
    return res.status(503).json({
      success: false,
      code: "TENANT_CONTEXT_UNAVAILABLE",
      message: "Institute authentication is temporarily unavailable.",
    });
  }

  let decoded;

  try {
    decoded = verifyTenantAccessToken(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      code:
        error.name === "TokenExpiredError"
          ? "TENANT_ACCESS_TOKEN_EXPIRED"
          : "TENANT_ACCESS_TOKEN_INVALID",
      message: "Your institute session is invalid or expired.",
    });
  }

  if (
    decoded.type !== "access" ||
    decoded.instituteId !== req.tenantContext.instituteId ||
    decoded.tenantKey !== req.tenantContext.collectionPrefix
  ) {
    return res.status(401).json({
      success: false,
      code: "TENANT_TOKEN_MISMATCH",
      message: "This session does not belong to the current institute.",
    });
  }

  try {
    const User = req.getTenantModel("User");

    const user = await User.findById(decoded.sub).populate({
      path: "assignedRole",
      select: "name label permissions isActive roleType isSystem",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "TENANT_USER_NOT_FOUND",
        message: "Institute account not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        code: "TENANT_USER_SUSPENDED",
        message:
          "Your institute account is suspended. Contact your administrator.",
      });
    }

    // A role change invalidates an access token issued for the old role.
    if (decoded.role && decoded.role !== user.role) {
      return res.status(401).json({
        success: false,
        code: "TENANT_ROLE_CHANGED",
        message:
          "Your account permissions have changed. Please sign in again.",
      });
    }

    req.tenantUser = user;
    req.tenantUserModel = User;

    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorizeTenantRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.tenantUser) {
      return res.status(401).json({
        success: false,
        code: "TENANT_AUTH_REQUIRED",
        message: "Institute authentication is required.",
      });
    }

    if (!allowedRoles.includes(req.tenantUser.role)) {
      return res.status(403).json({
        success: false,
        code: "TENANT_ROLE_FORBIDDEN",
        message: "You are not authorized for this institute action.",
      });
    }

    return next();
  };
};

export const getTenantAuthenticatedUser = (req) => {
  if (!req.tenantUser) {
    throw new Error("TENANT_USER_NOT_AUTHENTICATED");
  }

  return sanitizeTenantUser(req.tenantUser);
};
