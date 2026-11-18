
import crypto from "crypto";

import WebsiteStudyResourceSettings from "../models/WebsiteStudyResourceSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_ITEMS = 8;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const getOrCreateSettings = async () => {
  let settings = await WebsiteStudyResourceSettings.findOne({ key: "default" });

  if (!settings) {
    settings = await WebsiteStudyResourceSettings.create({
      key: "default",
      items: [],
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
  ) return "image/png";

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return "image/jpeg";

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";

  return null;
};

const isValidDestination = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;

  const url = value.trim();

  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Admin: load current Study Resources settings.
export const getWebsiteStudyResources = async (_req, res, next) => {
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

// Admin: upload a card image using existing WebsiteBannerImage storage.
export const uploadWebsiteStudyResourceImage = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return sendError(res, 400, "Please select a Study Resource image.");
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(res, 400, "Image must be 8 MB or smaller.");
    }

    const detectedMimeType = detectImageMimeType(req.file.buffer);

    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
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
      message: "Study Resource image uploaded successfully.",
      data: {
        imageUrl: `/api/website-editor/banner-image/${version}`,
        imageVersion: version,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: replace the ordered card collection.
export const updateWebsiteStudyResources = async (req, res, next) => {
  try {
    const incomingItems = req.body?.items;

    if (!Array.isArray(incomingItems)) {
      return sendError(
        res,
        400,
        "Study Resource cards must be provided as an array."
      );
    }

    if (incomingItems.length > MAX_ITEMS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_ITEMS} Study Resource cards are allowed.`
      );
    }

    const items = [];
    const keys = new Set();
    const imageVersions = new Set();

    for (let index = 0; index < incomingItems.length; index += 1) {
      const item = incomingItems[index] || {};
      const key = String(item.key || "").trim();
      const imageUrl = String(item.imageUrl || "").trim();
      const imageVersion = String(item.imageVersion || "").trim();
      const title = String(item.title || "").trim();
      const description = String(item.description || "").trim();
      const buttonText = String(item.buttonText || "").trim();
      const buttonUrl = String(item.buttonUrl || "").trim();

      if (!key || key.length > 100 || keys.has(key)) {
        return sendError(
          res,
          400,
          "Every card needs a unique valid key."
        );
      }
      keys.add(key);

      if (
        !imageVersion ||
        imageVersion.length > 100 ||
        imageUrl !== `/api/website-editor/banner-image/${imageVersion}`
      ) {
        return sendError(
          res,
          400,
          `Upload a valid image for "${title || `card ${index + 1}`}".`
        );
      }
      imageVersions.add(imageVersion);

      if (!title || title.length > 60) {
        return sendError(
          res,
          400,
          "Every card title must contain 1 to 60 characters."
        );
      }

      if (!description || description.length > 250) {
        return sendError(
          res,
          400,
          `Description for "${title}" must contain 1 to 250 characters.`
        );
      }

      if (!buttonText || buttonText.length > 40) {
        return sendError(
          res,
          400,
          `Button text for "${title}" must contain 1 to 40 characters.`
        );
      }

      if (
        !buttonUrl ||
        buttonUrl.length > 500 ||
        !isValidDestination(buttonUrl)
      ) {
        return sendError(
          res,
          400,
          `Enter a valid internal path or HTTP/HTTPS URL for "${title}".`
        );
      }

      items.push({
        key,
        imageUrl,
        imageVersion,
        title,
        description,
        buttonText,
        buttonUrl,
        openInNewTab: item.openInNewTab === true,
        isVisible: item.isVisible !== false,
        displayOrder: index,
      });
    }

    // Verify every image belongs to an uploaded image record.
    if (imageVersions.size) {
      const storedImages = await WebsiteBannerImage.find({
        version: { $in: [...imageVersions] },
      })
        .select("version")
        .lean();

      if (storedImages.length !== imageVersions.size) {
        return sendError(
          res,
          400,
          "One or more Study Resource images are missing. Upload them again."
        );
      }
    }

    const settings = await WebsiteStudyResourceSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          items,
          updatedBy: req.user._id,
        },
        $setOnInsert: { key: "default" },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Keep old image binaries because they may be shared with other sections.

    return res.status(200).json({
      success: true,
      message: "Study Resources saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return visible cards in the admin-defined order.
export const getPublicWebsiteStudyResources = async (_req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const items = (settings.items || [])
      .filter((item) => item.isVisible !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => ({
        key: item.key,
        imageUrl: item.imageUrl,
        title: item.title,
        description: item.description,
        buttonText: item.buttonText,
        buttonUrl: item.buttonUrl,
        openInNewTab: item.openInNewTab === true,
        displayOrder: item.displayOrder,
      }));

    return res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
};
