
import {
  ALL_PERMISSION_KEYS,
  STUDENT_PERMISSIONS,
  hasPermission,
} from "../constants/permissions.js";

const ALL_TENANT_PERMISSIONS = new Set([
  ...ALL_PERMISSION_KEYS,
  ...STUDENT_PERMISSIONS,
]);

const sendError = (res, status, code, message) =>
  res.status(status).json({
    success: false,
    code,
    message,
  });

/**
 * Tenant role authorization.
 *
 * Requires authenticateTenant to run first.
 * Does not use legacy req.user.
 */
export const authorizeTenantRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.tenantUser) {
      return sendError(
        res,
        401,
        "TENANT_AUTH_REQUIRED",
        "Institute authentication is required."
      );
    }

    if (
      !allowedRoles.length ||
      !allowedRoles.includes(req.tenantUser.role)
    ) {
      return sendError(
        res,
        403,
        "TENANT_ROLE_FORBIDDEN",
        "You are not authorized for this institute action."
      );
    }

    return next();
  };
};

/**
 * Tenant permission authorization.
 *
 * Admin:
 *   Full institute-level access.
 *
 * Staff:
 *   Permissions from the current active assigned Role.
 *
 * Student:
 *   Only explicitly listed student self-service permissions.
 *   Student permissions never grant Admin management access.
 */
export const requireTenantPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.tenantUser) {
      return sendError(
        res,
        401,
        "TENANT_AUTH_REQUIRED",
        "Institute authentication is required."
      );
    }

    if (
      !req.tenantContext?.instituteId ||
      typeof req.getTenantModel !== "function"
    ) {
      return sendError(
        res,
        503,
        "TENANT_CONTEXT_UNAVAILABLE",
        "Institute services are temporarily unavailable."
      );
    }

    if (!requiredPermissions.length) {
      return sendError(
        res,
        500,
        "TENANT_PERMISSION_NOT_CONFIGURED",
        "No permission was configured for this route."
      );
    }

    const invalidPermissions = requiredPermissions.filter(
      (permission) =>
        typeof permission !== "string" ||
        !ALL_TENANT_PERMISSIONS.has(permission)
    );

    if (invalidPermissions.length) {
      return sendError(
        res,
        500,
        "TENANT_PERMISSION_CONFIGURATION_INVALID",
        "The route contains an invalid permission configuration."
      );
    }

    const role = req.tenantUser.role;

    // Admin is trusted through the authenticated database account.
    if (role === "admin") {
      return next();
    }

    // Staff must have a current, active assigned Role.
    if (role === "staff") {
      const assignedRole = req.tenantUser.assignedRole;

      if (
        !assignedRole ||
        typeof assignedRole !== "object" ||
        assignedRole.isActive !== true ||
        !Array.isArray(assignedRole.permissions)
      ) {
        return sendError(
          res,
          403,
          "TENANT_ASSIGNED_ROLE_INVALID",
          "Your assigned role is missing or inactive."
        );
      }

      const permitted = requiredPermissions.every(
        (permission) =>
          hasPermission(
            assignedRole.permissions,
            permission
          )
      );

      if (!permitted) {
        return sendError(
          res,
          403,
          "TENANT_PERMISSION_FORBIDDEN",
          "You do not have permission to perform this action."
        );
      }

      return next();
    }

    // Student permissions are limited to the explicit
    // student self-service permission list.
    if (role === "student") {
      const studentOnlyRequest = requiredPermissions.every(
        (permission) =>
          STUDENT_PERMISSIONS.includes(permission)
      );

      if (!studentOnlyRequest) {
        return sendError(
          res,
          403,
          "TENANT_PERMISSION_FORBIDDEN",
          "Student accounts cannot access institute management actions."
        );
      }

      return next();
    }

    return sendError(
      res,
      403,
      "TENANT_ROLE_FORBIDDEN",
      "This account role is not authorized."
    );
  };
};
