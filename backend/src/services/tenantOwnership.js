
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
 *
 * Never reads student ID from req.body, req.query,
 * headers or URL parameters.
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
 *
 * Example:
 *   buildTenantStudentOwnershipFilter(req)
 *   => { student_id: authenticatedStudentId }
 *
 * Use only a trusted, server-defined field name.
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
 *
 * Missing resources and invalid ownership both return false.
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
