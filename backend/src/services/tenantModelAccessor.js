
import {
  getTenantCollectionName,
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

/**
 * Creates one model accessor for the current HTTP request.
 *
 * The tenant context must come from resolveTenant middleware.
 * The model map must come from registerTenantModelSet.
 *
 * Never pass req.body, query parameters or headers as the
 * source of institute identity, model names or collection names.
 */
export const createTenantModelAccessor = (req, models) => {
  const tenantContext = req?.tenantContext;

  if (
    !tenantContext ||
    !tenantContext.instituteId ||
    !tenantContext.collectionPrefix
  ) {
    throw new Error("TENANT_CONTEXT_MISSING");
  }

  if (!models || typeof models !== "object") {
    throw new Error("TENANT_MODEL_SET_MISSING");
  }

  const trustedInstitute = Object.freeze({
    _id: tenantContext.instituteId,
    collectionPrefix: tenantContext.collectionPrefix,
  });

  return (modelName) => {
    // Do not allow the request's tenant identity to change
    // after this accessor has been created.
    if (req.tenantContext !== tenantContext) {
      throw new Error("TENANT_CONTEXT_CHANGED");
    }

    // Only model names in the server-side registry are accepted.
    if (
      typeof modelName !== "string" ||
      !isTenantModel(modelName)
    ) {
      throw new Error("TENANT_MODEL_NOT_REGISTERED");
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        models,
        modelName
      )
    ) {
      throw new Error("TENANT_MODEL_NOT_AVAILABLE");
    }

    const model = models[modelName];

    if (!model?.collection?.name || !model?.modelName) {
      throw new Error("TENANT_MODEL_INVALID");
    }

    const expectedCollection = getTenantCollectionName(
      trustedInstitute,
      modelName
    );

    const expectedModelName =
      `${modelName}__${trustedInstitute.collectionPrefix}`;

    // A model registered for another institute must never
    // be returned, even if it was accidentally passed in.
    if (
      model.collection.name !== expectedCollection ||
      model.modelName !== expectedModelName
    ) {
      throw new Error("TENANT_MODEL_BOUNDARY_VIOLATION");
    }

    return model;
  };
};

/**
 * Attach the accessor as a non-writable, non-configurable
 * property to the current request.
 */
export const attachTenantModelAccessor = (req, models) => {
  if (
    Object.prototype.hasOwnProperty.call(
      req,
      "getTenantModel"
    )
  ) {
    throw new Error("TENANT_MODEL_ACCESSOR_ALREADY_ATTACHED");
  }

  const accessor = createTenantModelAccessor(req, models);

  Object.defineProperty(req, "getTenantModel", {
    value: accessor,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return accessor;
};
