
import crypto from "crypto";

import WebsiteTeamSettings from "../models/WebsiteTeamSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_MEMBERS = 20;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  heading: "Our Team",
  highlightText: "Team",
  description:
    "We craft solutions that amplify key characteristics, achieving a harmonious balance of function and intent. Through careful analysis and collaborative engagement, our spaces transcend the conventional.",
  members: [],
});

const getOrCreateSettings = async () => {
  let settings = await WebsiteTeamSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteTeamSettings.create(getDefaults());
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

  let members = Array.isArray(source.members)
    ? [...source.members].sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
      )
    : [];

  if (publicOnly) {
    members = members.filter(
      (member) => member.isVisible !== false
    );
  }

  return {
    ...getDefaults(),
    ...source,
    members: members.map((member, index) => ({
      key: member.key,
      imageUrl: member.imageUrl,
      imageVersion: member.imageVersion,
      name: member.name,
      designation: member.designation,
      displayOrder: index,
      isVisible: member.isVisible !== false,
    })),
  };
};

// Admin: get Our Team settings.
export const getWebsiteTeamSettings = async (
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

// Admin: upload a JPG/JPEG team member image.
export const uploadWebsiteTeamImage = async (
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
        "Please select a team member image."
      );
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(
        res,
        400,
        "Team member image must be 8 MB or smaller."
      );
    }

    if (
      req.file.mimetype !== "image/jpeg" ||
      !isValidJpeg(req.file.buffer)
    ) {
      return sendError(
        res,
        400,
        "Only valid JPG/JPEG team member images are allowed."
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
      message: "Team member image uploaded successfully.",
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

// Admin: update Our Team settings.
export const updateWebsiteTeamSettings = async (
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
    const description = String(
      body.description || ""
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

    if (description.length > 600) {
      return sendError(
        res,
        400,
        "Description cannot exceed 600 characters."
      );
    }

    if (!Array.isArray(body.members)) {
      return sendError(
        res,
        400,
        "Team members must be provided as an array."
      );
    }

    if (body.members.length > MAX_MEMBERS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_MEMBERS} team members are allowed.`
      );
    }

    const keys = new Set();
    const imageVersions = new Set();
    const members = [];

    for (let index = 0; index < body.members.length; index += 1) {
      const member = body.members[index] || {};

      const key = String(member.key || "").trim();
      const imageUrl = String(member.imageUrl || "").trim();
      const imageVersion = String(
        member.imageVersion || ""
      ).trim();
      const name = String(member.name || "").trim();
      const designation = String(
        member.designation || ""
      ).trim();

      if (
        !key ||
        key.length > 100 ||
        keys.has(key)
      ) {
        return sendError(
          res,
          400,
          "Every team member must have a unique valid key."
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
          `Upload a valid JPG image for team member ${index + 1}.`
        );
      }

      if (!name || name.length > 120) {
        return sendError(
          res,
          400,
          `Team member ${index + 1}: name must contain 1 to 120 characters.`
        );
      }

      if (!designation || designation.length > 120) {
        return sendError(
          res,
          400,
          `Team member ${index + 1}: designation must contain 1 to 120 characters.`
        );
      }

      imageVersions.add(imageVersion);

      members.push({
        key,
        imageUrl,
        imageVersion,
        name,
        designation,
        displayOrder: index,
        isVisible: member.isVisible !== false,
      });
    }

    // Verify that every referenced image exists and is JPEG.
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
          "One or more team images are missing or are not JPG files. Upload them again."
        );
      }
    }

    const settings = await WebsiteTeamSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          enabled,
          heading,
          highlightText,
          description,
          members,
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
      message: "Our Team settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled Our Team section and visible members.
export const getPublicWebsiteTeamSettings = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings, true);

    if (!data.enabled || data.members.length === 0) {
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
