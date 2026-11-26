
import { getPlatformConnection } from "../config/platformDb.js";

import {
  loadTenantModelDefinitions,
} from "../services/tenantSchemaLoader.js";

import {
  registerTenantModelSet,
} from "../services/tenantModelFactory.js";

import {
  attachTenantModelAccessor,
} from "../services/tenantModelAccessor.js";

let definitionsPromise = null;

const getDefinitions = async () => {
  if (!definitionsPromise) {
    definitionsPromise = loadTenantModelDefinitions().catch(
      (error) => {
        definitionsPromise = null;
        throw error;
      }
    );
  }

  return definitionsPromise;
};

export const attachTenantModels = async (req, res, next) => {
  try {
    if (!req.tenantContext) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CONTEXT_MISSING",
        message: "A trusted institute context is required.",
      });
    }

    const {
      instituteId,
      collectionPrefix,
    } = req.tenantContext;

    if (!instituteId || !collectionPrefix) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CONTEXT_INVALID",
        message: "The resolved institute context is invalid.",
      });
    }

    // These values are taken only from resolveTenant.
    // Never use browser-supplied institute IDs or prefixes.
    const institute = {
      _id: instituteId,
      collectionPrefix,
    };

    const connection = getPlatformConnection();

    const definitions = await getDefinitions();

    const models = registerTenantModelSet(
      connection,
      institute,
      definitions
    );

    // Attach the single request-scoped model accessor.
    attachTenantModelAccessor(req, models);

    // Retain the trusted institute metadata for existing
    // tenant middleware and controllers that need it.
    req.tenantInstitute = Object.freeze(institute);

    return next();
  } catch (error) {
    console.error(
      "Tenant model context failed:",
      error.message
    );

    return res.status(503).json({
      success: false,
      code: "TENANT_MODELS_UNAVAILABLE",
      message:
        "Institute services are temporarily unavailable.",
    });
  }
};
