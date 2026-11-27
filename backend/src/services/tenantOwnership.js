
import {
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

const toObjectIdString = (value) => {
  if (!value) return null;

  const id =
    typeof value === "object" && value._id
      ? String(value._id)
      : String(value);

  return OBJECT_ID_PATTERN.test(id) ? id : null;
};

/**
 * Returns the linked Student ID belonging to the
 * authenticated tenant student.
 */
export const getAuthenticatedTenantStudentId = (req) => {
  if (req?.tenantUser?.role !== "student") {
    throw new Error("TENANT_STUDENT_ACCESS_REQUIRED");
  }

  const studentId = toObjectIdString(
    req.tenantUser.studentRecord
  );

  if (!studentId) {
    throw new Error("TENANT_STUDENT_RECORD_NOT_LINKED");
  }

  return studentId;
};

/**
 * Builds an ownership filter using the authenticated
 * student's linked Student record.
 */
export const buildTenantStudentOwnershipFilter = (
  req,
  field = "student_id"
) => {
  if (
    typeof field !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)
  ) {
    throw new Error("TENANT_OWNERSHIP_FIELD_INVALID");
  }

  const studentId = getAuthenticatedTenantStudentId(req);

  return {
    [field]: studentId,
  };
};

/**
 * Checks whether a resource belongs to the authenticated
 * tenant student.
 */
export const tenantStudentOwnsResource = (
  req,
  resource,
  field = "student_id"
) => {
  if (!resource || typeof resource !== "object") {
    return false;
  }

  const studentId = getAuthenticatedTenantStudentId(req);
  const resourceStudentId = toObjectIdString(
    resource[field]
  );

  return (
    resourceStudentId !== null &&
    resourceStudentId === studentId
  );
};

/**
 * Middleware factory for loading a student-owned resource.
 *
 * Model names must exist in the tenant collection registry.
 * Central platform models and unknown models are rejected.
 */
export const loadOwnedTenantStudentResource = ({
  modelName,
  paramName = "id",
  ownerField = "student_id",
  requestProperty = "ownedTenantResource",
} = {}) => {
  if (
    typeof modelName !== "string" ||
    !/^[A-Z][A-Za-z0-9]*$/.test(modelName) ||
    !isTenantModel(modelName)
  ) {
    throw new Error("TENANT_OWNERSHIP_MODEL_INVALID");
  }

  if (
    typeof paramName !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(paramName)
  ) {
    throw new Error("TENANT_OWNERSHIP_PARAM_INVALID");
  }

  if (
    typeof ownerField !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(ownerField)
  ) {
    throw new Error("TENANT_OWNERSHIP_FIELD_INVALID");
  }

  if (
    typeof requestProperty !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(requestProperty)
  ) {
    throw new Error("TENANT_OWNERSHIP_PROPERTY_INVALID");
  }

  return async (req, res, next) => {
    try {
      if (!req.tenantUser) {
        return res.status(401).json({
          success: false,
          code: "TENANT_AUTH_REQUIRED",
          message: "Institute authentication is required.",
        });
      }

      if (
        !req.tenantContext?.instituteId ||
        typeof req.getTenantModel !== "function"
      ) {
        return res.status(503).json({
          success: false,
          code: "TENANT_CONTEXT_UNAVAILABLE",
          message: "Institute services are unavailable.",
        });
      }

      const studentId =
        getAuthenticatedTenantStudentId(req);

      const resourceId = toObjectIdString(
        req.params?.[paramName]
      );

      if (!resourceId) {
        return res.status(404).json({
          success: false,
          code: "TENANT_RESOURCE_NOT_FOUND",
          message: "Resource not found.",
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(
          req,
          requestProperty
        )
      ) {
        return res.status(500).json({
          success: false,
          code: "TENANT_OWNERSHIP_PROPERTY_CONFLICT",
          message: "Resource ownership could not be verified.",
        });
      }

      // Resolve only through the trusted tenant model accessor.
      const Model = req.getTenantModel(modelName);

      // Check resource ID and authenticated owner together.
      const resource = await Model.findOne({
        _id: resourceId,
        [ownerField]: studentId,
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          code: "TENANT_RESOURCE_NOT_FOUND",
          message: "Resource not found.",
        });
      }

      Object.defineProperty(req, requestProperty, {
        value: resource,
        enumerable: false,
        configurable: false,
        writable: false,
      });

      return next();
    } catch (error) {
      if (
        error.message === "TENANT_STUDENT_ACCESS_REQUIRED" ||
        error.message === "TENANT_STUDENT_RECORD_NOT_LINKED"
      ) {
        return res.status(403).json({
          success: false,
          code: error.message,
          message:
            error.message === "TENANT_STUDENT_ACCESS_REQUIRED"
              ? "Student portal access only."
              : "Your account is not linked to a student record.",
        });
      }

      return next(error);
    }
  };
};
