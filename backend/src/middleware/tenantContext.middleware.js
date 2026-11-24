
import { getPlatformConnection } from "../config/platformDb.js";

import {
  getTenantCollectionPrefix,
  TENANT_COLLECTION_PREFIX_PATTERN,
} from "../config/tenantCollectionRegistry.js";

/**
 * Use after a trusted hostname/domain resolver.
 *
 * The resolver must load req.tenant from the central institutes
 * collection. Do not populate req.tenant from arbitrary request data.
 */
const tenantContext = (req, res, next) => {
  try {
    const institute = req.tenant;

    if (!institute?._id) {
      return res.status(400).json({
        success: false,
        message: "Institute context could not be resolved.",
        code: "TENANT_CONTEXT_MISSING",
      });
    }

    if (institute.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This institute is not currently active.",
        code: "INSTITUTE_NOT_ACTIVE",
      });
    }

    if (institute.provisioningStatus !== "ready") {
      return res.status(403).json({
        success: false,
        message: "This institute is not ready for access.",
        code: "INSTITUTE_NOT_PROVISIONED",
      });
    }

    const collectionPrefix =
      getTenantCollectionPrefix(institute);

    if (
      !TENANT_COLLECTION_PREFIX_PATTERN.test(collectionPrefix)
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid institute collection configuration.",
        code: "INVALID_TENANT_CONFIGURATION",
      });
    }

    const connection = getPlatformConnection();

    req.tenantContext = Object.freeze({
      instituteId: String(institute._id),
      institute,
      collectionPrefix,
      connection,
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

export default tenantContext;
