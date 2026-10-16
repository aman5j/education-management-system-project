
import { hasPermission } from "../constants/permissions.js";

/**
 * Require one or more permissions for an authenticated user.
 *
 * IMPORTANT:
 * - authenticate must run before this middleware.
 * - Admin receives full access through the trusted backend role.
 * - Staff permissions are loaded from their assigned Role record.
 * - Student self-service permissions must be checked separately
 *   from Admin management permissions.
 */
export const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (!requiredPermissions.length) {
        return res.status(500).json({
          success: false,
          message: "No permission was configured for this route.",
        });
      }

      // Admin authorization is based on the authenticated backend
      // user role, not on permissions supplied by the frontend.
      if (req.user.role === "admin") {
        return next();
      }

      // This middleware is intended for staff permission checks.
      // Student access should use dedicated student/ownership checks.
      if (req.user.role !== "staff") {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      const assignedRole = req.user.assignedRole;

      if (
        !assignedRole ||
        assignedRole.isActive !== true ||
        !Array.isArray(assignedRole.permissions)
      ) {
        return res.status(403).json({
          success: false,
          message: "Your assigned role is missing or inactive.",
        });
      }

      const permitted = requiredPermissions.every((permission) =>
        hasPermission(assignedRole.permissions, permission)
      );

      if (!permitted) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
