
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import tenantFileStorage from "./tenantFileStorage.js";

const MIME_EXTENSIONS = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const isMissing = (error) => error?.code === "ENOENT";

const createTenantCategoryIconService = ({
  storage = tenantFileStorage,
} = {}) => {
  if (
    !storage ||
    typeof storage.getTenantDirectory !== "function"
  ) {
    throw new Error("TENANT_CATEGORY_ICON_STORAGE_INVALID");
  }

  const getTrustedContext = (tenantContext) => {
    if (
      !tenantContext?.instituteId ||
      !tenantContext?.collectionPrefix
    ) {
      throw new Error("TENANT_CONTEXT_UNAVAILABLE");
    }

    // This validates instituteId and collectionPrefix together.
    return storage.getTenantDirectory(tenantContext);
  };

  const ensureSafeDirectory = async (
    directory,
    expectedParent
  ) => {
    const stat = await fs.lstat(directory).catch((error) => {
      if (isMissing(error)) return null;
      throw error;
    });

    if (!stat) {
      try {
        await fs.mkdir(directory, {
          recursive: false,
          mode: 0o700,
        });
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
    }

    const verifiedStat = await fs.lstat(directory);

    if (
      !verifiedStat.isDirectory() ||
      verifiedStat.isSymbolicLink()
    ) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    const realDirectory = await fs.realpath(directory);
    const realParent = await fs.realpath(expectedParent);

    if (path.dirname(realDirectory) !== realParent) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    return realDirectory;
  };

  const getIconsDirectory = async (tenantContext) => {
    const tenantRoot = getTrustedContext(tenantContext);
    const configuredRoot = storage.rootDir;

    if (
      typeof configuredRoot !== "string" ||
      !path.isAbsolute(configuredRoot)
    ) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    await fs.mkdir(configuredRoot, {
      recursive: true,
      mode: 0o700,
    });

    const realStorageRoot = await fs.realpath(configuredRoot);

    const expectedTenantRoot = path.resolve(
      realStorageRoot,
      path.basename(tenantRoot)
    );

    if (
      path.resolve(tenantRoot) !==
      path.resolve(configuredRoot, path.basename(tenantRoot))
    ) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    await ensureSafeDirectory(
      tenantRoot,
      realStorageRoot
    );

    const realTenantRoot = await fs.realpath(tenantRoot);

    if (realTenantRoot !== expectedTenantRoot) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    const categoriesDirectory = path.join(
      realTenantRoot,
      "categories"
    );

    const realCategoriesDirectory =
      await ensureSafeDirectory(
        categoriesDirectory,
        realTenantRoot
      );

    const iconsDirectory = path.join(
      realCategoriesDirectory,
      "icons"
    );

    return ensureSafeDirectory(
      iconsDirectory,
      realCategoriesDirectory
    );
  };

  const getSafeIconPath = async (
    tenantContext,
    fileName
  ) => {
    if (
      typeof fileName !== "string" ||
      !FILE_NAME_PATTERN.test(fileName) ||
      path.basename(fileName) !== fileName
    ) {
      throw new Error("TENANT_CATEGORY_ICON_NAME_INVALID");
    }

    const directory = await getIconsDirectory(tenantContext);
    const filePath = path.resolve(directory, fileName);

    if (
      path.dirname(filePath) !== directory ||
      filePath === directory
    ) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    return filePath;
  };

  const saveIcon = async (
    tenantContext,
    buffer,
    mimeType
  ) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("TENANT_CATEGORY_ICON_INVALID");
    }

    const extension = MIME_EXTENSIONS[mimeType];

    if (!extension) {
      throw new Error("TENANT_CATEGORY_ICON_TYPE_INVALID");
    }

    const directory = await getIconsDirectory(tenantContext);
    const fileName = `${randomUUID()}${extension}`;
    const filePath = await getSafeIconPath(
      tenantContext,
      fileName
    );

    await fs.writeFile(filePath, buffer, {
      flag: "wx",
      mode: 0o600,
    });

    return {
      fileName,
      filePath,
      mimeType,
      fileSize: buffer.length,
    };
  };

  const readIcon = async (
    tenantContext,
    fileName
  ) => {
    const filePath = await getSafeIconPath(
      tenantContext,
      fileName
    );

    const stat = await fs.lstat(filePath).catch((error) => {
      if (isMissing(error)) return null;
      throw error;
    });

    if (
      !stat ||
      !stat.isFile() ||
      stat.isSymbolicLink()
    ) {
      return null;
    }

    const realFilePath = await fs.realpath(filePath);
    const directory = await getIconsDirectory(tenantContext);

    if (path.dirname(realFilePath) !== directory) {
      throw new Error("TENANT_CATEGORY_ICON_PATH_INVALID");
    }

    return {
      path: realFilePath,
      size: stat.size,
      mimeType: path.extname(fileName).toLowerCase() === ".png"
        ? "image/png"
        : path.extname(fileName).toLowerCase() === ".webp"
          ? "image/webp"
          : "image/jpeg",
    };
  };

  const deleteIcon = async (
    tenantContext,
    fileName
  ) => {
    const filePath = await getSafeIconPath(
      tenantContext,
      fileName
    );

    await fs.unlink(filePath).catch((error) => {
      if (!isMissing(error)) {
        throw error;
      }
    });

    return true;
  };

  return Object.freeze({
    getIconsDirectory,
    getSafeIconPath,
    saveIcon,
    readIcon,
    deleteIcon,
  });
};

const tenantCategoryIconService =
  createTenantCategoryIconService();

export {
  createTenantCategoryIconService,
};

export default tenantCategoryIconService;
