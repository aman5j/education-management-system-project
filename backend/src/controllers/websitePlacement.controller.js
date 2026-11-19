
import crypto from "crypto";

import WebsitePlacementSettings from "../models/WebsitePlacementSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_STORIES = 20;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  heading: "Our Success Placement Story",
  highlightText: "Placement Story",
  stories: [],
});

const getOrCreateSettings = async () => {
  let settings = await WebsitePlacementSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsitePlacementSettings.create(getDefaults());
  }

  return settings;
};

const isValidJpeg = (buffer) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= 3 &&
  buffer[0] === 0xff &&
  buffer[1] === 0xd8 &&
  buffer[2] === 0xff;

const serializeSettings = (settings, publicOnly = false) => {
  const source = settings?.toObject
    ? settings.toObject()
    : settings || {};

  let stories = Array.isArray(source.stories)
    ? [...source.stories].sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
      )
    : [];

  if (publicOnly) {
    stories = stories.filter(
      (story) => story.isVisible !== false
    );
  }

  return {
    ...getDefaults(),
    ...source,
    stories: stories.map((story, index) => ({
      key: story.key,
      imageUrl: story.imageUrl,
      imageVersion: story.imageVersion,
      title: story.title,
      description: story.description,
      displayOrder: index,
      isVisible: story.isVisible !== false,
    })),
  };
};

// Admin: get Placement Stories settings.
export const getWebsitePlacementSettings = async (
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

// Admin: upload a placement story JPG image.
export const uploadWebsitePlacementImage = async (
  req,
  res,
  next
) => {
  let createdImage = null;

  try {
    if (!req.file?.buffer) {
      return sendError(
        res,
        400,
        "Please select a placement story image."
      );
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(
        res,
        400,
        "Placement image must be 8 MB or smaller."
      );
    }

    if (
      req.file.mimetype !== "image/jpeg" ||
      !isValidJpeg(req.file.buffer)
    ) {
      return sendError(
        res,
        400,
        "Only valid JPG/JPEG placement images are allowed."
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
      message: "Placement story image uploaded successfully.",
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

// Admin: save Placement Stories settings.
export const updateWebsitePlacementSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const enabled = body.enabled !== false;
    const heading = String(body.heading || "").trim();
    const highlightText = String(
      body.highlightText || ""
    ).trim();

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

    if (!Array.isArray(body.stories)) {
      return sendError(
        res,
        400,
        "Placement stories must be provided as an array."
      );
    }

    if (body.stories.length > MAX_STORIES) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_STORIES} placement stories are allowed.`
      );
    }

    const keys = new Set();
    const imageVersions = new Set();
    const stories = [];

    for (let index = 0; index < body.stories.length; index += 1) {
      const story = body.stories[index] || {};

      const key = String(story.key || "").trim();
      const imageUrl = String(story.imageUrl || "").trim();
      const imageVersion = String(
        story.imageVersion || ""
      ).trim();
      const title = String(story.title || "").trim();
      const description = String(
        story.description || ""
      ).trim();

      if (!key || key.length > 100 || keys.has(key)) {
        return sendError(
          res,
          400,
          "Every placement story must have a unique valid key."
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
          `Upload a valid JPG image for placement story ${index + 1}.`
        );
      }

      if (!title || title.length > 120) {
        return sendError(
          res,
          400,
          `Story ${index + 1}: title must contain 1 to 120 characters.`
        );
      }

      if (!description || description.length > 300) {
        return sendError(
          res,
          400,
          `Story ${index + 1}: description must contain 1 to 300 characters.`
        );
      }

      imageVersions.add(imageVersion);

      stories.push({
        key,
        imageUrl,
        imageVersion,
        title,
        description,
        displayOrder: index,
        isVisible: story.isVisible !== false,
      });
    }

    // Verify that every referenced image exists and is a JPG.
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
          "One or more placement images are missing or are not JPG files. Upload them again."
        );
      }
    }

    const settings = await WebsitePlacementSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          enabled,
          heading,
          highlightText,
          stories,
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
      message: "Placement Stories settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled Placement Stories and visible cards.
export const getPublicWebsitePlacementSettings = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings, true);

    if (!data.enabled || data.stories.length === 0) {
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
