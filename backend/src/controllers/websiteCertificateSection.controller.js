
import crypto from "crypto";

import WebsiteCertificateSectionSettings from "../models/WebsiteCertificateSectionSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: false,
  imageUrl: "",
  imageVersion: "",
  title: "",
  highlightText: "",
  description: "",
  listItems: [],
  buttonText: "View Full Certificate",
  buttonAction: "image",
  externalUrl: "",
});

const getOrCreateSettings = async () => {
  let settings = await WebsiteCertificateSectionSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteCertificateSectionSettings.create(
      getDefaults()
    );
  }

  return settings;
};

const detectImageMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  // PNG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "image/png";
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

const isValidExternalUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const serializeSettings = (settings) => {
  const source = settings?.toObject
    ? settings.toObject()
    : settings || {};

  return {
    ...getDefaults(),
    ...source,
    listItems: Array.isArray(source.listItems)
      ? source.listItems
          .map((item, index) => ({
            key: item.key,
            text: item.text,
            displayOrder: index,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder)
      : [],
  };
};

// Admin: get Certificate Section settings.
export const getWebsiteCertificateSection = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: upload or replace the left-side certificate image.
export const uploadWebsiteCertificateSectionImage = async (
  req,
  res,
  next
) => {
  let createdImage = null;

  try {
    if (!req.file?.buffer) {
      return sendError(res, 400, "Please select a certificate image.");
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(
        res,
        400,
        "Certificate image must be 8 MB or smaller."
      );
    }

    const detectedMimeType = detectImageMimeType(req.file.buffer);

    if (
      !detectedMimeType ||
      detectedMimeType !== req.file.mimetype
    ) {
      return sendError(
        res,
        400,
        "Choose a valid JPG, PNG or WEBP certificate image."
      );
    }

    const version = crypto.randomUUID();

    createdImage = await WebsiteBannerImage.create({
      version,
      contentType: detectedMimeType,
      data: req.file.buffer,
      size: req.file.size,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate Section image uploaded successfully.",
      data: {
        imageUrl: `/api/website-editor/banner-image/${version}`,
        imageVersion: version,
      },
    });
  } catch (error) {
    if (createdImage?.version) {
      await WebsiteBannerImage.deleteOne({
        version: createdImage.version,
      }).catch(() => {});
    }

    next(error);
  }
};

// Admin: save Certificate Section content.
export const updateWebsiteCertificateSection = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const enabled = body.enabled === true;
    const imageUrl = String(body.imageUrl || "").trim();
    const imageVersion = String(body.imageVersion || "").trim();
    const title = String(body.title || "").trim();
    const highlightText = String(body.highlightText || "").trim();
    const description = String(body.description || "").trim();
    const buttonText = String(body.buttonText || "").trim();
    const buttonAction = String(body.buttonAction || "image").trim();
    const externalUrl = String(body.externalUrl || "").trim();

    if (!["image", "url"].includes(buttonAction)) {
      return sendError(res, 400, "Invalid Certificate button action.");
    }

    if (title.length > 180) {
      return sendError(res, 400, "Title cannot exceed 180 characters.");
    }

    if (highlightText.length > 100) {
      return sendError(
        res,
        400,
        "Highlighted title text cannot exceed 100 characters."
      );
    }

    if (description.length > 1000) {
      return sendError(
        res,
        400,
        "Description cannot exceed 1000 characters."
      );
    }

    if (buttonText.length > 60) {
      return sendError(
        res,
        400,
        "Button text cannot exceed 60 characters."
      );
    }

    if (enabled) {
      if (!imageVersion || !imageUrl) {
        return sendError(
          res,
          400,
          "Upload the Certificate Section image before enabling the section."
        );
      }

      if (
        imageUrl !==
        `/api/website-editor/banner-image/${imageVersion}`
      ) {
        return sendError(res, 400, "Invalid certificate image reference.");
      }

      if (!title || !description || !buttonText) {
        return sendError(
          res,
          400,
          "Title, description and button text are required when the section is enabled."
        );
      }

      if (
        buttonAction === "url" &&
        !isValidExternalUrl(externalUrl)
      ) {
        return sendError(
          res,
          400,
          "Enter a valid HTTP or HTTPS destination URL."
        );
      }
    }

    let listItems = [];

    if (body.listItems !== undefined) {
      if (!Array.isArray(body.listItems)) {
        return sendError(res, 400, "List items must be an array.");
      }

      const keys = new Set();

      for (let index = 0; index < body.listItems.length; index += 1) {
        const item = body.listItems[index] || {};
        const key = String(item.key || "").trim();
        const text = String(item.text || "").trim();

        if (!key || keys.has(key)) {
          return sendError(
            res,
            400,
            "Every list item must have a unique key."
          );
        }

        if (!text || text.length > 300) {
          return sendError(
            res,
            400,
            "Every list item must contain 1 to 300 characters."
          );
        }

        keys.add(key);

        listItems.push({
          key,
          text,
          displayOrder: index,
        });
      }
    }

    if (imageVersion) {
      if (
        imageUrl !==
        `/api/website-editor/banner-image/${imageVersion}`
      ) {
        return sendError(res, 400, "Invalid certificate image reference.");
      }

      const imageExists = await WebsiteBannerImage.exists({
        version: imageVersion,
      });

      if (!imageExists) {
        return sendError(
          res,
          400,
          "Certificate image was not found. Please upload it again."
        );
      }
    }

    const update = {
      enabled,
      imageUrl,
      imageVersion,
      title,
      highlightText,
      description,
      listItems,
      buttonText: buttonText || "View Full Certificate",
      buttonAction,
      externalUrl,
      updatedBy: req.user._id,
    };

    const settings = await WebsiteCertificateSectionSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: update,
        $setOnInsert: { key: "default" },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Certificate Section settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled Certificate Section content only.
export const getPublicWebsiteCertificateSection = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings);

    if (!data.enabled) {
      return res.status(200).json({
        success: true,
        data: { settings: null },
      });
    }

    return res.status(200).json({
      success: true,
      data: { settings: data },
    });
  } catch (error) {
    next(error);
  }
};
