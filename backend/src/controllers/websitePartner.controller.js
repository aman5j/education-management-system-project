
import crypto from "crypto";

import WebsitePartnerSettings from "../models/WebsitePartnerSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_LOGOS = 20;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  heading: "Trusted by industry leaders and valued partners worldwide",
  highlightText: "industry leaders and valued partners",
  visibleCount: 5,
  autoSlide: true,
  logos: [],
});

const getOrCreateSettings = async () => {
  let settings = await WebsitePartnerSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsitePartnerSettings.create(getDefaults());
  }

  return settings;
};

const isValidJpeg = (buffer) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= 3 &&
  buffer[0] === 0xff &&
  buffer[1] === 0xd8 &&
  buffer[2] === 0xff;

const serializeSettings = (settings) => {
  const source = settings?.toObject
    ? settings.toObject()
    : settings || {};

  return {
    ...getDefaults(),
    ...source,
    logos: Array.isArray(source.logos)
      ? [...source.logos]
          .sort(
            (a, b) =>
              (a.displayOrder || 0) - (b.displayOrder || 0)
          )
          .map((logo, index) => ({
            key: logo.key,
            name: logo.name || "",
            imageUrl: logo.imageUrl,
            imageVersion: logo.imageVersion,
            displayOrder: index,
          }))
      : [],
  };
};

// Admin: load Partners settings.
export const getWebsitePartnerSettings = async (
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

// Admin: upload one JPG partner logo.
export const uploadWebsitePartnerLogo = async (
  req,
  res,
  next
) => {
  let createdImage = null;

  try {
    if (!req.file?.buffer) {
      return sendError(res, 400, "Please select a partner logo.");
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(
        res,
        400,
        "Partner logo must be 8 MB or smaller."
      );
    }

    if (
      req.file.mimetype !== "image/jpeg" ||
      !isValidJpeg(req.file.buffer)
    ) {
      return sendError(
        res,
        400,
        "Only valid JPG/JPEG partner logos are allowed."
      );
    }

    const version = crypto.randomUUID();

    createdImage = await WebsiteBannerImage.create({
      version,
      contentType: "image/jpeg",
      data: req.file.buffer,
      size: req.file.size,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Partner logo uploaded successfully.",
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

// Admin: save heading, slider settings and ordered logos.
export const updateWebsitePartnerSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const heading = String(body.heading || "").trim();
    const highlightText = String(body.highlightText || "").trim();
    const visibleCount = Number(body.visibleCount);
    const enabled = body.enabled !== false;
    const autoSlide = body.autoSlide !== false;
    const incomingLogos = body.logos;

    if (!heading || heading.length > 180) {
      return sendError(
        res,
        400,
        "Heading must contain 1 to 180 characters."
      );
    }

    if (highlightText.length > 100) {
      return sendError(
        res,
        400,
        "Highlight text cannot exceed 100 characters."
      );
    }

    if (
      !Number.isInteger(visibleCount) ||
      visibleCount < 1 ||
      visibleCount > 8
    ) {
      return sendError(
        res,
        400,
        "Logos-to-show count must be between 1 and 8."
      );
    }

    if (!Array.isArray(incomingLogos)) {
      return sendError(
        res,
        400,
        "Partner logos must be provided as an array."
      );
    }

    if (incomingLogos.length > MAX_LOGOS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_LOGOS} partner logos are allowed.`
      );
    }

    const keys = new Set();
    const imageVersions = new Set();
    const logos = [];

    for (let index = 0; index < incomingLogos.length; index += 1) {
      const logo = incomingLogos[index] || {};
      const key = String(logo.key || "").trim();
      const name = String(logo.name || "").trim();
      const imageUrl = String(logo.imageUrl || "").trim();
      const imageVersion = String(logo.imageVersion || "").trim();

      if (!key || key.length > 100 || keys.has(key)) {
        return sendError(
          res,
          400,
          "Every partner logo must have a unique valid key."
        );
      }

      keys.add(key);

      if (
        !imageVersion ||
        imageVersion.length > 100 ||
        imageUrl !==
          `/api/website-editor/banner-image/${imageVersion}`
      ) {
        return sendError(
          res,
          400,
          `Upload a valid JPG logo for ${name || `logo ${index + 1}`}.`
        );
      }

      if (name.length > 100) {
        return sendError(
          res,
          400,
          "Partner name cannot exceed 100 characters."
        );
      }

      imageVersions.add(imageVersion);

      logos.push({
        key,
        name,
        imageUrl,
        imageVersion,
        displayOrder: index,
      });
    }

    // Confirm that every image version exists in shared image storage.
    if (imageVersions.size > 0) {
      const storedImages = await WebsiteBannerImage.find({
        version: { $in: [...imageVersions] },
        contentType: "image/jpeg",
      })
        .select("version")
        .lean();

      if (storedImages.length !== imageVersions.size) {
        return sendError(
          res,
          400,
          "One or more partner logo images are missing or are not JPG files. Upload them again."
        );
      }
    }

    const settings = await WebsitePartnerSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          enabled,
          heading,
          highlightText,
          visibleCount,
          autoSlide,
          logos,
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

    return res.status(200).json({
      success: true,
      message: "Partners settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled Partners content.
export const getPublicWebsitePartners = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings);

    if (!data.enabled || data.logos.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          settings: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        settings: data,
      },
    });
  } catch (error) {
    next(error);
  }
};
