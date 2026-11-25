
import { getPlatformConnection } from "../config/platformDb.js";
import {
  loadTenantModelDefinitions,
} from "../services/tenantSchemaLoader.js";
import {
  registerTenantModelSet,
} from "../services/tenantModelFactory.js";

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

    // Construct only from resolver-generated values.
    // Never use instituteId or collectionPrefix from req.body/headers.
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

    req.tenantModels = models;
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
