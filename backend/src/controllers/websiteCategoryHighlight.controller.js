import crypto from "crypto";

import WebsiteCategoryHighlightSettings from "../models/WebsiteCategoryHighlightSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_ITEMS = 8;

const DEFAULT_ITEMS = [
  {
    key: "daily-live",
    title: "Daily Live",
    description: "Interactive classes",
    iconUrl: "",
    iconVersion: "",
    isVisible: true,
  },
  {
    key: "ten-million",
    title: "10 Million +",
    description: "Tests, sample papers & notes",
    iconUrl: "",
    iconVersion: "",
    isVisible: true,
  },
  {
    key: "doubt-support",
    title: "24 x 7",
    description: "Doubt solving sessions",
    iconUrl: "",
    iconVersion: "",
    isVisible: true,
  },
  {
    key: "offline-centres",
    title: "100 +",
    description: "Offline centres",
    iconUrl: "",
    iconVersion: "",
    isVisible: true,
  },
];

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getOrCreateSettings = async () => {
  let settings = await WebsiteCategoryHighlightSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteCategoryHighlightSettings.create({
      key: "default",
      items: DEFAULT_ITEMS,
    });
  }

  return settings;
};

const detectImageMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

export const getWebsiteCategoryHighlights = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWebsiteCategoryHighlights = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    if (!Array.isArray(body.items)) {
      return sendError(
        res,
        400,
        "Category highlight items must be provided as an array."
      );
    }

    if (body.items.length > MAX_ITEMS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_ITEMS} category highlights are allowed.`
      );
    }

    const items = [];
    const keys = new Set();

    for (const item of body.items) {
      const key = String(item?.key || "").trim();
      const title = String(item?.title || "").trim();
      const description = String(item?.description || "").trim();
      const iconUrl = String(item?.iconUrl || "").trim();
      const iconVersion = String(item?.iconVersion || "").trim();

      if (!key || key.length > 100 || keys.has(key)) {
        return sendError(
          res,
          400,
          "Every category highlight needs a unique valid key."
        );
      }

      keys.add(key);

      if (!title || title.length > 60) {
        return sendError(
          res,
          400,
          "Every highlight title must contain 1 to 60 characters."
        );
      }

      if (!description || description.length > 150) {
        return sendError(
          res,
          400,
          "Every highlight description must contain 1 to 150 characters."
        );
      }

      if (
        (iconUrl && !iconVersion) ||
        (!iconUrl && iconVersion)
      ) {
        return sendError(
          res,
          400,
          `The icon image for "${title}" is incomplete. Please upload it again.`
        );
      }

      items.push({
        key,
        title,
        description,
        iconUrl,
        iconVersion,
        isVisible: item?.isVisible !== false,
      });
    }

    const previousSettings = await getOrCreateSettings();
    const previousVersions = previousSettings.items
      .map((item) => item.iconVersion)
      .filter(Boolean);

    const nextVersions = new Set(
      items.map((item) => item.iconVersion).filter(Boolean)
    );

    const settings = await WebsiteCategoryHighlightSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          items,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          key: "default",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Delete only icon images no longer referenced by saved settings.
    const obsoleteVersions = previousVersions.filter(
      (version) => !nextVersions.has(version)
    );

    if (obsoleteVersions.length) {
      await WebsiteBannerImage.deleteMany({
        version: { $in: obsoleteVersions },
      }).catch((error) => {
        console.error(
          "Unable to clean up old category highlight icons:",
          error
        );
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category highlights saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadWebsiteCategoryHighlightIcon = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file?.buffer) {
      return sendError(res, 400, "Please select an icon image.");
    }

    if (req.file.size > 8 * 1024 * 1024) {
      return sendError(res, 400, "Icon image must be 8 MB or smaller.");
    }

    const detectedMimeType = detectImageMimeType(req.file.buffer);

    if (
      !detectedMimeType ||
      detectedMimeType !== req.file.mimetype
    ) {
      return sendError(
        res,
        400,
        "Choose a valid JPG, PNG or WEBP image."
      );
    }

    const version = crypto.randomUUID();

    await WebsiteBannerImage.create({
      version,
      contentType: detectedMimeType,
      data: req.file.buffer,
      size: req.file.size,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Highlight icon uploaded successfully.",
      data: {
        iconUrl: `/api/website-editor/banner-image/${version}`,
        iconVersion: version,
      },
    });
  } catch (error) {
    next(error);
  }
};