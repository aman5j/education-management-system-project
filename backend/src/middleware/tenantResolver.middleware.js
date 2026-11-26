
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

  // Remove a valid port when supplied.
  if (hostname.includes(":")) {
    const parts = hostname.split(":");

    if (
      parts.length !== 2 ||
      !/^\d{1,5}$/.test(parts[1]) ||
      Number(parts[1]) < 1 ||
      Number(parts[1]) > 65535
    ) {
      throw new Error("INVALID_HOSTNAME");
    }

    hostname = parts[0];
  }

  // Accept one trailing DNS root dot.
  if (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
  }

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

const createErrorResponse = (statusCode, code, message) => ({
  statusCode,
  code,
  message,
});

const getReservedHostError = (
  hostname,
  baseDomain,
  reservedHosts
) => {
  if (
    hostname === baseDomain ||
    reservedHosts.has(hostname)
  ) {
    return createErrorResponse(
      404,
      "PLATFORM_HOST_RESERVED",
      "This hostname is reserved for the EMS Platform."
    );
  }

  const suffix = `.${baseDomain}`;

  if (hostname.endsWith(suffix)) {
    const subdomain = hostname.slice(0, -suffix.length);

    // Only one institute slug level is permitted.
    if (
      !subdomain ||
      subdomain.includes(".") ||
      DEFAULT_RESERVED_LABELS.includes(subdomain)
    ) {
      return createErrorResponse(
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
  const instituteId = String(institute?._id || "").toLowerCase();

  if (!/^[a-f0-9]{24}$/.test(instituteId)) {
    throw new Error("INVALID_TENANT_RECORD");
  }

  const expectedPrefix = `inst_${instituteId}`;

  if (
    institute.collectionPrefix &&
    institute.collectionPrefix !== expectedPrefix
  ) {
    throw new Error("INVALID_TENANT_RECORD");
  }

  const schemaVersion = Number(
    institute.tenantSchemaVersion || 1
  );

  if (
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    throw new Error("INVALID_TENANT_RECORD");
  }

  return Object.freeze({
    instituteId,
    slug: institute.slug,
    hostname,
    collectionPrefix: expectedPrefix,
    tenantSchemaVersion: schemaVersion,
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

const attachResolvedTenant = (req, resolved) => {
  req.tenant = resolved.tenant;
  req.tenantContext = resolved.tenantContext;
};

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

  // Keep the cache bounded.
  while (resolutionCache.size >= maxEntries) {
    const oldestKey = resolutionCache.keys().next().value;

    if (oldestKey === undefined) break;

    resolutionCache.delete(oldestKey);
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
    Math.min(
      Math.floor(Number(maxCacheEntries) || 1),
      5000
    )
  );

  return async (req, res, next) => {
    try {
      // Do not retain any previously attached tenant context.
      delete req.tenant;
      delete req.tenantContext;

      /*
       * req.hostname is provided by Express.
       *
       * Never read X-Forwarded-Host directly.
       * Express may use forwarded host information only when
       * the configured proxy is trusted by the application.
       */
      const hostname = normalizeHostname(req.hostname);

      const reservedError = getReservedHostError(
        hostname,
        normalizedBaseDomain,
        reserved
      );

      if (reservedError) {
        return res
          .status(reservedError.statusCode)
          .json({
            success: false,
            code: reservedError.code,
            message: reservedError.message,
          });
      }

      const cached = getCacheEntry(hostname);

      if (cached) {
        attachResolvedTenant(req, cached.value);
        return next();
      }

      const platformSlug = getPlatformSubdomainSlug(
        hostname,
        normalizedBaseDomain
      );

      /*
       * IMPORTANT:
       *
       * Platform subdomains resolve ONLY by institute slug.
       * Custom domains resolve ONLY by exact domain.
       *
       * This prevents a custom-domain record from claiming
       * an institute's reserved platform subdomain.
       */
      const lookupFilter = platformSlug
        ? { slug: platformSlug }
        : { domain: hostname };

      const institutes = await findInstitutes(
        lookupFilter
      );

      if (!Array.isArray(institutes)) {
        throw new Error("INVALID_REGISTRY_RESULT");
      }

      if (institutes.length === 0) {
        return res.status(404).json({
          success: false,
          code: "TENANT_NOT_FOUND",
          message:
            "No institute is registered for this hostname.",
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

      let isVerifiedCustomDomain = false;

      if (!platformSlug && institute.domain) {
        try {
          const registeredDomain = normalizeHostname(
            institute.domain
          );

          isVerifiedCustomDomain =
            registeredDomain === hostname &&
            institute.domainVerified === true;
        } catch {
          isVerifiedCustomDomain = false;
        }
      }

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
          message:
            "This institute is currently suspended.",
        });
      }

      if (institute.status === "deactivated") {
        return res.status(403).json({
          success: false,
          code: "TENANT_DEACTIVATED",
          message:
            "This institute has been deactivated.",
        });
      }

      if (institute.status !== "active") {
        return res.status(403).json({
          success: false,
          code: "TENANT_INACTIVE",
          message:
            "This institute is not active.",
        });
      }

      if (institute.provisioningStatus === "pending") {
        return res.status(503).json({
          success: false,
          code: "TENANT_PROVISIONING_PENDING",
          message:
            "Institute setup is not complete.",
        });
      }

      if (institute.provisioningStatus === "failed") {
        return res.status(503).json({
          success: false,
          code: "TENANT_PROVISIONING_FAILED",
          message:
            "Institute setup has failed.",
        });
      }

      if (institute.provisioningStatus !== "ready") {
        return res.status(503).json({
          success: false,
          code: "TENANT_NOT_READY",
          message:
            "This institute is not ready.",
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

      // Attach context only after every validation succeeds.
      attachResolvedTenant(req, resolved);

      return next();
    } catch (error) {
      if (error.message === "INVALID_HOSTNAME") {
        return res.status(400).json({
          success: false,
          code: "INVALID_HOSTNAME",
          message:
            "The request hostname is invalid.",
        });
      }

      // Registry and tenant-record errors fail closed.
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
  process.env.PLATFORM_BASE_DOMAIN?.trim();

if (
  process.env.NODE_ENV === "production" &&
  !platformBaseDomain
) {
  throw new Error(
    "PLATFORM_BASE_DOMAIN must be configured in production."
  );
}

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
