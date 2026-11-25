
import { domainToASCII } from "node:url";
import { isIP } from "node:net";

import { getPlatformConnection } from "../config/platformDb.js";
import getInstituteModel from "../models/Institute.js";

const DEFAULT_CACHE_TTL_MS = 5000;
const DEFAULT_MAX_CACHE_ENTRIES = 1000;

const DEFAULT_RESERVED_LABELS = [
  "platform",
  "api",
  "admin",
  "app",
  "www",
  "mail",
  "static",
  "assets",
];

const resolutionCache = new Map();

export const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw new Error("INVALID_HOSTNAME");
  }

  let hostname = value.trim().toLowerCase();

  if (
    !hostname ||
    hostname.length > 300 ||
    /[\s/@?#,[\]\\]/.test(hostname) ||
    hostname.includes("://")
  ) {
    throw new Error("INVALID_HOSTNAME");
  }

  // Express req.hostname normally excludes the port.
  // This also supports direct utility calls with host:port.
  if (hostname.includes(":")) {
    const parts = hostname.split(":");

    if (
      parts.length !== 2 ||
      !/^\d{1,5}$/.test(parts[1]) ||
      Number(parts[1]) > 65535
    ) {
      throw new Error("INVALID_HOSTNAME");
    }

    hostname = parts[0];
  }

  hostname = hostname.replace(/\.$/, "");

  const asciiHostname = domainToASCII(hostname);

  if (
    !asciiHostname ||
    asciiHostname.length > 253 ||
    isIP(asciiHostname)
  ) {
    throw new Error("INVALID_HOSTNAME");
  }

  if (asciiHostname === "localhost") {
    return asciiHostname;
  }

  const labels = asciiHostname.split(".");

  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    throw new Error("INVALID_HOSTNAME");
  }

  return asciiHostname;
};

const parseReservedHosts = (values = []) => {
  const result = new Set();

  for (const value of values) {
    if (!value) continue;

    result.add(normalizeHostname(value));
  }

  return result;
};

const createError = (statusCode, code, message) => ({
  statusCode,
  code,
  message,
});

const getReservedHostError = (
  hostname,
  baseDomain,
  reservedHosts
) => {
  if (reservedHosts.has(hostname) || hostname === baseDomain) {
    return createError(
      404,
      "PLATFORM_HOST_RESERVED",
      "This hostname is reserved for the EMS Platform."
    );
  }

  const suffix = `.${baseDomain}`;

  if (hostname.endsWith(suffix)) {
    const subdomain = hostname.slice(0, -suffix.length);

    if (
      !subdomain ||
      subdomain.includes(".") ||
      DEFAULT_RESERVED_LABELS.includes(subdomain)
    ) {
      return createError(
        404,
        "PLATFORM_HOST_RESERVED",
        "This hostname is reserved for the EMS Platform."
      );
    }
  }

  return null;
};

const getPlatformSubdomainSlug = (hostname, baseDomain) => {
  const suffix = `.${baseDomain}`;

  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const slug = hostname.slice(0, -suffix.length);

  // Only one institute slug level is permitted.
  if (
    !slug ||
    slug.includes(".") ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return null;
  }

  return slug;
};

const makeTenantContext = (institute, hostname) => {
  const instituteId = String(institute._id);

  const collectionPrefix =
    `inst_${instituteId.toLowerCase()}`;

  // Never trust a prefix stored in an unverified client request.
  if (
    institute.collectionPrefix &&
    institute.collectionPrefix !== collectionPrefix
  ) {
    throw new Error("INVALID_TENANT_PREFIX");
  }

  return Object.freeze({
    instituteId,
    slug: institute.slug,
    hostname,
    collectionPrefix,
    tenantSchemaVersion:
      institute.tenantSchemaVersion || 1,
  });
};

const makeTenantSummary = (institute) =>
  Object.freeze({
    id: String(institute._id),
    name: institute.name,
    slug: institute.slug,
    status: institute.status,
    provisioningStatus: institute.provisioningStatus,
  });

const getCacheEntry = (hostname) => {
  const entry = resolutionCache.get(hostname);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    resolutionCache.delete(hostname);
    return null;
  }

  return entry;
};

const setCacheEntry = (
  hostname,
  value,
  maxEntries,
  ttlMs
) => {
  if (ttlMs <= 0) return;

  if (resolutionCache.size >= maxEntries) {
    const oldestKey = resolutionCache.keys().next().value;

    if (oldestKey) {
      resolutionCache.delete(oldestKey);
    }
  }

  resolutionCache.set(hostname, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

export const invalidateTenantResolutionCache = () => {
  resolutionCache.clear();
};

export const createTenantResolver = ({
  findInstitutes,
  baseDomain,
  reservedHosts = [],
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
}) => {
  if (typeof findInstitutes !== "function") {
    throw new Error(
      "Tenant resolver requires a findInstitutes function."
    );
  }

  const normalizedBaseDomain = normalizeHostname(baseDomain);

  const reserved = parseReservedHosts([
    ...reservedHosts,
    normalizedBaseDomain,
  ]);

  const ttl = Math.max(
    0,
    Math.min(Number(cacheTtlMs) || 0, 30000)
  );

  const maxEntries = Math.max(
    1,
    Math.min(Number(maxCacheEntries) || 1, 5000)
  );

  return async (req, res, next) => {
    try {
      /*
       * IMPORTANT:
       * req.hostname is supplied by Express.
       * Express only uses X-Forwarded-Host when trust proxy
       * is configured for the actual trusted proxy.
       *
       * Never read X-Forwarded-Host directly here.
       */
      const hostname = normalizeHostname(req.hostname);

      const reservedError = getReservedHostError(
        hostname,
        normalizedBaseDomain,
        reserved
      );

      if (reservedError) {
        return res.status(reservedError.statusCode).json({
          success: false,
          code: reservedError.code,
          message: reservedError.message,
        });
      }

      const cached = getCacheEntry(hostname);

      if (cached) {
        req.tenant = cached.value.tenant;
        req.tenantContext = cached.value.tenantContext;

        return next();
      }

      const platformSlug = getPlatformSubdomainSlug(
        hostname,
        normalizedBaseDomain
      );

      /*
       * A platform subdomain resolves by the unique institute slug.
       * A custom domain resolves only when domainVerified === true.
       *
       * The current repository does not yet have a DNS verification
       * workflow. Phase 6 will implement the complete Domain registry.
       */
      const conditions = [];

      if (platformSlug) {
        conditions.push({ slug: platformSlug });
      }

      conditions.push({ domain: hostname });

      const institutes = await findInstitutes({
        $or: conditions,
      });

      if (!Array.isArray(institutes)) {
        throw new Error("INVALID_REGISTRY_RESULT");
      }

      if (institutes.length === 0) {
        return res.status(404).json({
          success: false,
          code: "TENANT_NOT_FOUND",
          message: "No institute is registered for this hostname.",
        });
      }

      if (institutes.length > 1) {
        return res.status(409).json({
          success: false,
          code: "TENANT_DOMAIN_CONFLICT",
          message:
            "This hostname is associated with multiple institutes.",
        });
      }

      const institute = institutes[0];

      const isApprovedPlatformSubdomain =
        Boolean(platformSlug) &&
        institute.slug === platformSlug;

      const isVerifiedCustomDomain =
        institute.domain === hostname &&
        institute.domainVerified === true;

      if (
        !isApprovedPlatformSubdomain &&
        !isVerifiedCustomDomain
      ) {
        return res.status(403).json({
          success: false,
          code: "TENANT_DOMAIN_UNVERIFIED",
          message:
            "This institute domain has not been verified.",
        });
      }

      if (institute.status === "suspended") {
        return res.status(403).json({
          success: false,
          code: "TENANT_SUSPENDED",
          message: "This institute is currently suspended.",
        });
      }

      if (institute.status === "deactivated") {
        return res.status(403).json({
          success: false,
          code: "TENANT_DEACTIVATED",
          message: "This institute has been deactivated.",
        });
      }

      if (institute.status !== "active") {
        return res.status(403).json({
          success: false,
          code: "TENANT_INACTIVE",
          message: "This institute is not active.",
        });
      }

      if (institute.provisioningStatus === "pending") {
        return res.status(503).json({
          success: false,
          code: "TENANT_PROVISIONING_PENDING",
          message: "Institute setup is not complete.",
        });
      }

      if (institute.provisioningStatus === "failed") {
        return res.status(503).json({
          success: false,
          code: "TENANT_PROVISIONING_FAILED",
          message: "Institute setup has failed.",
        });
      }

      if (institute.provisioningStatus !== "ready") {
        return res.status(503).json({
          success: false,
          code: "TENANT_NOT_READY",
          message: "This institute is not ready.",
        });
      }

      const tenantContext = makeTenantContext(
        institute,
        hostname
      );

      const tenant = makeTenantSummary(institute);

      const resolved = Object.freeze({
        tenant,
        tenantContext,
      });

      setCacheEntry(
        hostname,
        resolved,
        maxEntries,
        ttl
      );

      // Attach context only after all registry and status checks.
      req.tenant = tenant;
      req.tenantContext = tenantContext;

      return next();
    } catch (error) {
      if (
        error.message === "INVALID_HOSTNAME" ||
        error.message === "INVALID_TENANT_PREFIX"
      ) {
        return res.status(400).json({
          success: false,
          code: error.message,
          message: "The request hostname or tenant configuration is invalid.",
        });
      }

      // Registry/database errors must fail closed.
      console.error(
        "Tenant resolver failed:",
        error.message
      );

      return res.status(503).json({
        success: false,
        code: "TENANT_REGISTRY_UNAVAILABLE",
        message:
          "Institute routing is temporarily unavailable.",
      });
    }
  };
};

const getInstituteModelInstance = () => {
  return getInstituteModel(getPlatformConnection());
};

const platformBaseDomain =
  process.env.PLATFORM_BASE_DOMAIN;

const configuredReservedHosts = (
  process.env.PLATFORM_RESERVED_HOSTS || ""
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const productionResolver = createTenantResolver({
  baseDomain: platformBaseDomain || "localhost",
  reservedHosts: configuredReservedHosts,

  findInstitutes: async (filter) => {
    const Institute = getInstituteModelInstance();

    return Institute.find(filter)
      .limit(3)
      .lean();
  },
});

export const resolveTenant = productionResolver;
