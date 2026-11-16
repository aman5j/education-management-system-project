
import crypto from "crypto";

import WebsiteBannerSettings from "../models/WebsiteBannerSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_SLIDES = 10;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getOrCreateSettings = async () => {
  let settings = await WebsiteBannerSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteBannerSettings.create({
      key: "default",
      slides: [],
    });
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


const getImageBuffer = (rawData) => {
  if (!rawData) {
    return Buffer.alloc(0);
  }

  // Native Node.js Buffer or Mongoose Buffer
  if (Buffer.isBuffer(rawData)) {
    return Buffer.from(rawData);
  }

  // Uint8Array
  if (rawData instanceof Uint8Array) {
    return Buffer.from(
      rawData.buffer,
      rawData.byteOffset,
      rawData.byteLength
    );
  }

  // MongoDB BSON Binary
  if (rawData.buffer) {
    const binaryBuffer = Buffer.from(rawData.buffer);

    const length =
      Number.isInteger(rawData.position) &&
      rawData.position >= 0
        ? Math.min(rawData.position, binaryBuffer.length)
        : binaryBuffer.length;

    return Buffer.from(binaryBuffer.subarray(0, length));
  }

  // BSON Binary value()
  if (typeof rawData.value === "function") {
    return Buffer.from(rawData.value(true));
  }

  // JSON serialized Buffer
  if (
    rawData.type === "Buffer" &&
    Array.isArray(rawData.data)
  ) {
    return Buffer.from(rawData.data);
  }

  // ArrayBuffer
  if (rawData instanceof ArrayBuffer) {
    return Buffer.from(rawData);
  }

  return Buffer.alloc(0);
};


export const getWebsiteBannerSettings = async (_req, res, next) => {
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

export const uploadWebsiteBannerSlide = async (req, res, next) => {
  let createdImage = null;

  try {
    if (!req.file?.buffer) {
      return sendError(res, 400, "Please select a banner image.");
    }

    if (req.file.size > 8 * 1024 * 1024) {
      return sendError(res, 400, "Banner image must be 8 MB or smaller.");
    }

    const detectedMimeType = detectImageMimeType(req.file.buffer);

    if (
      !detectedMimeType ||
      detectedMimeType !== req.file.mimetype
    ) {
      return sendError(
        res,
        400,
        "The selected file is not a valid JPG, PNG, or WEBP image."
      );
    }

    const settings = await getOrCreateSettings();
    const slideKey = String(req.body?.slideKey || "").trim();

    const existingSlide = slideKey
      ? settings.slides.find((slide) => slide.key === slideKey)
      : null;

    if (slideKey && !existingSlide) {
      return sendError(res, 404, "Banner slide was not found.");
    }

    if (!existingSlide && settings.slides.length >= MAX_SLIDES) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_SLIDES} banner slides are allowed.`
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

    const imageUrl = `/api/website-editor/banner-image/${version}`;

    let oldImageVersion = null;

    if (existingSlide) {
      oldImageVersion = existingSlide.imageVersion;

      existingSlide.imageUrl = imageUrl;
      existingSlide.imageVersion = version;
    } else {
      settings.slides.push({
        key: crypto.randomUUID(),
        imageUrl,
        imageVersion: version,
      });
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    // Remove the replaced binary only after settings are saved.
    if (oldImageVersion) {
        await WebsiteBannerImage.deleteOne({
            version: oldImageVersion,
        }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: existingSlide
        ? "Banner image replaced successfully."
        : "Banner slide added successfully.",
      data: { settings },
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

export const deleteWebsiteBannerSlide = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const slideKey = String(req.params.slideKey || "");

    const slide = settings.slides.find(
      (item) => item.key === slideKey
    );

    if (!slide) {
      return sendError(res, 404, "Banner slide was not found.");
    }

    settings.slides = settings.slides.filter(
      (item) => item.key !== slideKey
    );

    settings.updatedBy = req.user._id;
    await settings.save();

    await WebsiteBannerImage.deleteOne({
      version: slide.imageVersion,
    });

    return res.status(200).json({
      success: true,
      message: "Banner slide deleted successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const reorderWebsiteBannerSlides = async (req, res, next) => {
  try {
    const slideKeys = req.body?.slideKeys;

    if (!Array.isArray(slideKeys)) {
      return sendError(res, 400, "Slide order must be an array.");
    }

    const settings = await getOrCreateSettings();

    const currentKeys = settings.slides.map((slide) => slide.key);

    if (
      slideKeys.length !== currentKeys.length ||
      new Set(slideKeys).size !== slideKeys.length ||
      !slideKeys.every((key) => currentKeys.includes(key))
    ) {
      return sendError(res, 400, "Invalid banner slide order.");
    }

    const slideMap = new Map(
      settings.slides.map((slide) => [slide.key, slide])
    );

    settings.slides = slideKeys.map((key) => slideMap.get(key));
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Banner slide order saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};


export const getWebsiteBannerImage = async (req, res, next) => {
  try {
    const version = String(req.params.version || "").trim();

    if (!version) {
      return res.status(400).json({
        success: false,
        message: "Image version is required.",
      });
    }

    // Use lean() to retrieve the stored BSON data directly.
    const image = await WebsiteBannerImage.findOne({
      version,
    })
      .select("version contentType data size")
      .lean();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Banner image record not found in database.",
        version,
      });
    }

    const buffer = getImageBuffer(image.data);

    if (!buffer || buffer.length === 0) {
      console.error("Banner image has empty binary data:", {
        version,
        storedSize: image.size,
        contentType: image.contentType,
        dataType: image.data?.constructor?.name,
      });

      return res.status(500).json({
        success: false,
        message: "Banner image binary data is empty or invalid.",
        version,
      });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(image.contentType)) {
      return res.status(500).json({
        success: false,
        message: "Unsupported banner image content type.",
      });
    }

    // Verify the stored image bytes against the declared MIME type.
    const isPng =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );

    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";

    const validImage =
      (image.contentType === "image/png" && isPng) ||
      (image.contentType === "image/jpeg" && isJpeg) ||
      (image.contentType === "image/webp" && isWebp);

    if (!validImage) {
      console.error("Banner image MIME mismatch:", {
        version,
        contentType: image.contentType,
        bufferLength: buffer.length,
      });

      return res.status(500).json({
        success: false,
        message: "Stored image data does not match its image format.",
        version,
      });
    }

    res.status(200);

    res.set({
      "Content-Type": image.contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    return res.end(buffer);
  } catch (error) {
    console.error("Banner image delivery failed:", error);

    return next(error);
  }
};

