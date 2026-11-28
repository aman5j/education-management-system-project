
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import tenantFileStorage from "./tenantFileStorage.js";

const MIME_EXTENSIONS = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

const MIME_BY_EXTENSION = Object.freeze({
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
});

const FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const isMissing = (error) => error?.code === "ENOENT";

export const createTenantCourseImageService = ({
  storage = tenantFileStorage,
} = {}) => {
  if (!storage?.getTenantDirectory || !storage?.rootDir) {
    throw new Error("TENANT_COURSE_IMAGE_STORAGE_INVALID");
  }

  const getCourseImageDirectory = async (context) => {
    const tenantRoot = storage.getTenantDirectory(context);
    const configuredRoot = path.resolve(storage.rootDir);

    await fs.mkdir(configuredRoot, {
      recursive: true,
      mode: 0o700,
    });

    const realRoot = await fs.realpath(configuredRoot);

    const expectedTenantRoot = path.resolve(
      realRoot,
      path.basename(tenantRoot)
    );

    if (
      path.resolve(tenantRoot) !==
      path.resolve(configuredRoot, path.basename(tenantRoot))
    ) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    const ensureDirectory = async (directory, parent) => {
      const existing = await fs.lstat(directory).catch((error) => {
        if (isMissing(error)) return null;
        throw error;
      });

      if (!existing) {
        try {
          await fs.mkdir(directory, {
            recursive: false,
            mode: 0o700,
          });
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      }

      const stat = await fs.lstat(directory);

      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
      }

      const realDirectory = await fs.realpath(directory);
      const realParent = await fs.realpath(parent);

      if (path.dirname(realDirectory) !== realParent) {
        throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
      }

      return realDirectory;
    };

    const realTenantRoot = await ensureDirectory(
      tenantRoot,
      realRoot
    );

    if (realTenantRoot !== expectedTenantRoot) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    const coursesDirectory = await ensureDirectory(
      path.join(realTenantRoot, "courses"),
      realTenantRoot
    );

    return ensureDirectory(
      path.join(coursesDirectory, "images"),
      coursesDirectory
    );
  };

  const getSafeImagePath = async (context, fileName) => {
    if (
      typeof fileName !== "string" ||
      !FILE_PATTERN.test(fileName) ||
      path.basename(fileName) !== fileName
    ) {
      throw new Error("TENANT_COURSE_IMAGE_NAME_INVALID");
    }

    const directory = await getCourseImageDirectory(context);
    const filePath = path.resolve(directory, fileName);

    if (path.dirname(filePath) !== directory) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    return { directory, filePath };
  };

  const saveImage = async (context, buffer, mimeType) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("TENANT_COURSE_IMAGE_INVALID");
    }

    const extension = MIME_EXTENSIONS[mimeType];

    if (!extension) {
      throw new Error("TENANT_COURSE_IMAGE_TYPE_INVALID");
    }

    const directory = await getCourseImageDirectory(context);
    const fileName = `${randomUUID()}${extension}`;
    const { filePath } = await getSafeImagePath(context, fileName);

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

  const readImage = async (context, fileName) => {
    const { directory, filePath } = await getSafeImagePath(
      context,
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

    const realPath = await fs.realpath(filePath);
    const realDirectory = await fs.realpath(directory);

    if (path.dirname(realPath) !== realDirectory) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    return {
      path: realPath,
      size: stat.size,
      mimeType:
        MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()],
    };
  };

  const deleteImage = async (context, fileName) => {
    const { directory, filePath } = await getSafeImagePath(
      context,
      fileName
    );

    const stat = await fs.lstat(filePath).catch((error) => {
      if (isMissing(error)) return null;
      throw error;
    });

    if (!stat) return true;

    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    const realPath = await fs.realpath(filePath);
    const realDirectory = await fs.realpath(directory);

    if (path.dirname(realPath) !== realDirectory) {
      throw new Error("TENANT_COURSE_IMAGE_PATH_INVALID");
    }

    await fs.unlink(filePath);
    return true;
  };

  return Object.freeze({
    getCourseImageDirectory,
    getSafeImagePath,
    saveImage,
    readImage,
    deleteImage,
  });
};

const tenantCourseImageService =
  createTenantCourseImageService();

export default tenantCourseImageService;
