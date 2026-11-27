
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i;

const MIME_EXTENSIONS = Object.freeze({
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ".xlsx",
});

const isWithin = (parent, candidate) => {
  const relative = path.relative(parent, candidate);

  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    )
  );
};

export const getTrustedTenantFileContext = (tenantContext) => {
  const instituteId = String(
    tenantContext?.instituteId || ""
  ).toLowerCase();

  const collectionPrefix = String(
    tenantContext?.collectionPrefix || ""
  );

  if (!OBJECT_ID_PATTERN.test(instituteId)) {
    throw new Error("TENANT_FILE_CONTEXT_INVALID");
  }

  const expectedPrefix = `inst_${instituteId}`;

  if (collectionPrefix !== expectedPrefix) {
    throw new Error("TENANT_FILE_PREFIX_INVALID");
  }

  return Object.freeze({
    instituteId,
    collectionPrefix: expectedPrefix,
  });
};

export const createTenantFileStorage = ({
  rootDir = path.resolve(
    process.cwd(),
    "private_uploads",
    "tenants"
  ),
} = {}) => {
  if (typeof rootDir !== "string" || !rootDir.trim()) {
    throw new Error("TENANT_FILE_ROOT_INVALID");
  }

  const absoluteRoot = path.resolve(rootDir);

  const getTenantDirectory = (tenantContext) => {
    const tenant = getTrustedTenantFileContext(tenantContext);

    const directory = path.resolve(
      absoluteRoot,
      tenant.collectionPrefix
    );

    if (!isWithin(absoluteRoot, directory)) {
      throw new Error("TENANT_FILE_PATH_INVALID");
    }

    return directory;
  };

  const ensureTenantDirectory = async (tenantContext) => {
    const directory = getTenantDirectory(tenantContext);

    await fs.mkdir(directory, {
      recursive: true,
      mode: 0o700,
    });

    return directory;
  };

  const createFileName = (mimeType) => {
    const extension = MIME_EXTENSIONS[mimeType];

    if (!extension) {
      throw new Error("TENANT_FILE_TYPE_NOT_ALLOWED");
    }

    return `${randomUUID()}${extension}`;
  };

  const getSafeFilePath = (
    tenantContext,
    fileName
  ) => {
    if (
      typeof fileName !== "string" ||
      !FILE_NAME_PATTERN.test(fileName) ||
      path.basename(fileName) !== fileName
    ) {
      throw new Error("TENANT_FILE_NAME_INVALID");
    }

    const directory = getTenantDirectory(tenantContext);

    const filePath = path.resolve(directory, fileName);

    if (!isWithin(directory, filePath) || filePath === directory) {
      throw new Error("TENANT_FILE_PATH_INVALID");
    }

    return filePath;
  };

  const getExistingFile = async (
    tenantContext,
    fileName
  ) => {
    const filePath = getSafeFilePath(
      tenantContext,
      fileName
    );

    const stat = await fs.stat(filePath).catch((error) => {
      if (error.code === "ENOENT") {
        return null;
      }

      throw error;
    });

    if (!stat?.isFile()) {
      return null;
    }

    return {
      path: filePath,
      size: stat.size,
      modifiedAt: stat.mtime,
    };
  };

  const deleteFile = async (
    tenantContext,
    fileName
  ) => {
    const filePath = getSafeFilePath(
      tenantContext,
      fileName
    );

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });

    return true;
  };

  return Object.freeze({
    rootDir: absoluteRoot,
    getTenantDirectory,
    ensureTenantDirectory,
    createFileName,
    getSafeFilePath,
    getExistingFile,
    deleteFile,
  });
};

const tenantFileStorage = createTenantFileStorage();

export default tenantFileStorage;
