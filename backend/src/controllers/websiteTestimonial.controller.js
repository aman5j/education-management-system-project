
import crypto from "crypto";

import WebsiteTestimonialSettings from "../models/WebsiteTestimonialSettings.js";
import WebsiteBannerImage from "../models/WebsiteBannerImage.js";

const MAX_TESTIMONIALS = 50;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  sectionLabel: "Testimonials",
  heading: "What Our Students Say",
  highlightText: "Students Say",
  description:
    "Hear from our students about their learning experience and journey with us.",
  testimonials: [],
});

const getOrCreateSettings = async () => {
  let settings = await WebsiteTestimonialSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteTestimonialSettings.create(getDefaults());
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

  let testimonials = Array.isArray(source.testimonials)
    ? [...source.testimonials].sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
      )
    : [];

  if (publicOnly) {
    testimonials = testimonials.filter(
      (item) => item.isVisible !== false
    );
  }

  return {
    ...getDefaults(),
    ...source,
    testimonials: testimonials.map((item, index) => ({
      key: item.key,
      imageUrl: item.imageUrl || "",
      imageVersion: item.imageVersion || "",
      name: item.name,
      designation: item.designation,
      rating: item.rating,
      review: item.review,
      displayOrder: index,
      isVisible: item.isVisible !== false,
    })),
  };
};

// Admin: retrieve settings.
export const getWebsiteTestimonialSettings = async (
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

// Admin: upload optional JPG/JPEG profile image.
export const uploadWebsiteTestimonialImage = async (
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
        "Please select a testimonial profile image."
      );
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return sendError(
        res,
        400,
        "Profile image must be 8 MB or smaller."
      );
    }

    if (
      req.file.mimetype !== "image/jpeg" ||
      !isValidJpeg(req.file.buffer)
    ) {
      return sendError(
        res,
        400,
        "Only valid JPG/JPEG profile images are allowed."
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
      message: "Testimonial image uploaded successfully.",
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

// Admin: save settings and testimonials.
export const updateWebsiteTestimonialSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const enabled = body.enabled !== false;
    const sectionLabel = String(
      body.sectionLabel || ""
    ).trim();
    const heading = String(body.heading || "").trim();
    const highlightText = String(
      body.highlightText || ""
    ).trim();
    const description = String(
      body.description || ""
    ).trim();

    if (!sectionLabel || sectionLabel.length > 80) {
      return sendError(
        res,
        400,
        "Section label must contain 1 to 80 characters."
      );
    }

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

    if (!Array.isArray(body.testimonials)) {
      return sendError(
        res,
        400,
        "Testimonials must be provided as an array."
      );
    }

    if (body.testimonials.length > MAX_TESTIMONIALS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_TESTIMONIALS} testimonials are allowed.`
      );
    }

    const keys = new Set();
    const imageVersions = new Set();
    const testimonials = [];

    for (
      let index = 0;
      index < body.testimonials.length;
      index += 1
    ) {
      const item = body.testimonials[index] || {};

      const key = String(item.key || "").trim();
      const name = String(item.name || "").trim();
      const designation = String(
        item.designation || ""
      ).trim();
      const review = String(item.review || "").trim();

      const rating = Number(item.rating);

      const imageUrl = String(item.imageUrl || "").trim();
      const imageVersion = String(
        item.imageVersion || ""
      ).trim();

      if (
        !key ||
        key.length > 100 ||
        keys.has(key)
      ) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: unique valid key is required.`
        );
      }

      keys.add(key);

      if (!name || name.length > 120) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: name must contain 1 to 120 characters.`
        );
      }

      if (!designation || designation.length > 120) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: designation must contain 1 to 120 characters.`
        );
      }

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: rating must be a whole number from 1 to 5.`
        );
      }

      if (!review || review.length > 1500) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: review must contain 1 to 1500 characters.`
        );
      }

      // Profile image is optional. Both fields must be empty
      // or must reference a valid uploaded image.
      if (Boolean(imageUrl) !== Boolean(imageVersion)) {
        return sendError(
          res,
          400,
          `Testimonial ${index + 1}: profile image information is incomplete.`
        );
      }

      if (imageVersion) {
        if (
          imageVersion.length > 100 ||
          imageUrl !==
            `/api/website-editor/banner-image/${imageVersion}`
        ) {
          return sendError(
            res,
            400,
            `Testimonial ${index + 1}: invalid profile image reference.`
          );
        }

        imageVersions.add(imageVersion);
      }

      testimonials.push({
        key,
        imageUrl,
        imageVersion,
        name,
        designation,
        rating,
        review,
        displayOrder: index,
        isVisible: item.isVisible !== false,
      });
    }

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
          "One or more testimonial images are missing or invalid. Upload them again."
        );
      }
    }

    const settings =
      await WebsiteTestimonialSettings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            enabled,
            sectionLabel,
            heading,
            highlightText,
            description,
            testimonials,
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
      message: "Testimonials settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return only visible testimonials.
export const getPublicWebsiteTestimonialSettings = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings, true);

    if (!data.enabled || data.testimonials.length === 0) {
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
