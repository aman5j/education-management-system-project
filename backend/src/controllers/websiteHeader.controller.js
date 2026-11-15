import WebsiteHeaderSettings from "../models/WebsiteHeaderSettings.js";

const DEFAULT_SETTINGS = {
  key: "default",
  topbarEnabled: true,
  announcementText: "",
  showTopbarEmail: true,
  showTopbarPhone: true,
  quickLinks: [],
  socialLinks: [],
  showInstituteLogo: true,
  showInstituteName: true,
  logoAlignment: "left",
  headerSticky: true,
  showLoginButton: true,
  loginButtonLabel: "Login",
  loginButtonUrl: "/login",
  showEnquiryButton: true,
  enquiryButtonLabel: "Enquire Now",
  enquiryButtonUrl: "/contact",
};

const BOOLEAN_FIELDS = [
  "topbarEnabled",
  "showTopbarEmail",
  "showTopbarPhone",
  "showInstituteLogo",
  "showInstituteName",
  "headerSticky",
  "showLoginButton",
  "showEnquiryButton",
];

const STRING_FIELDS = [
  "announcementText",
  "logoAlignment",
  "loginButtonLabel",
  "loginButtonUrl",
  "enquiryButtonLabel",
  "enquiryButtonUrl",
];

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const isValidUrl = (value, allowRelative = true) => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const url = value.trim();

  if (
    allowRelative &&
    url.startsWith("/") &&
    !url.startsWith("//")
  ) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const getOrCreateSettings = async () => {
  let settings = await WebsiteHeaderSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteHeaderSettings.create(
      DEFAULT_SETTINGS
    );
  }

  return settings;
};

export const getWebsiteHeaderSettings = async (
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

export const updateWebsiteHeaderSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};
    const updates = {};

    for (const field of BOOLEAN_FIELDS) {
      if (typeof body[field] === "boolean") {
        updates[field] = body[field];
      }
    }

    for (const field of STRING_FIELDS) {
      if (typeof body[field] === "string") {
        updates[field] = body[field].trim();
      }
    }

    if (
      updates.logoAlignment &&
      !["left", "center"].includes(updates.logoAlignment)
    ) {
      return sendError(res, 400, "Invalid logo alignment.");
    }

    for (const field of [
      "loginButtonLabel",
      "enquiryButtonLabel",
    ]) {
      if (
        Object.hasOwn(updates, field) &&
        (!updates[field] || updates[field].length > 30)
      ) {
        return sendError(
          res,
          400,
          `${field} must contain between 1 and 30 characters.`
        );
      }
    }

    for (const field of [
      "loginButtonUrl",
      "enquiryButtonUrl",
    ]) {
      if (
        Object.hasOwn(updates, field) &&
        !isValidUrl(updates[field])
      ) {
        return sendError(
          res,
          400,
          `Please enter a valid ${field}.`
        );
      }
    }

    if (Object.hasOwn(body, "quickLinks")) {
      if (
        !Array.isArray(body.quickLinks) ||
        body.quickLinks.length > 8
      ) {
        return sendError(
          res,
          400,
          "Maximum 8 quick links are allowed."
        );
      }

      const quickLinks = [];

      for (const item of body.quickLinks) {
        const label = String(item?.label || "").trim();
        const url = String(item?.url || "").trim();

        if (
          !label ||
          label.length > 40 ||
          !isValidUrl(url)
        ) {
          return sendError(
            res,
            400,
            "Every quick link needs a valid label and URL."
          );
        }

        quickLinks.push({ label, url });
      }

      updates.quickLinks = quickLinks;
    }

    if (Object.hasOwn(body, "socialLinks")) {
      if (
        !Array.isArray(body.socialLinks) ||
        body.socialLinks.length > 5
      ) {
        return sendError(
          res,
          400,
          "Maximum 5 social links are allowed."
        );
      }

      const allowedPlatforms = [
        "Facebook",
        "Instagram",
        "YouTube",
        "LinkedIn",
        "X",
      ];

      const socialLinks = [];

      for (const item of body.socialLinks) {
        const platform = String(item?.platform || "");
        const url = String(item?.url || "").trim();

        if (
          !allowedPlatforms.includes(platform) ||
          !isValidUrl(url, false)
        ) {
          return sendError(
            res,
            400,
            "Every social link needs a supported platform and valid URL."
          );
        }

        socialLinks.push({ platform, url });
      }

      updates.socialLinks = socialLinks;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(
        res,
        400,
        "No valid header settings were provided."
      );
    }

    updates.updatedBy = req.user._id;

    const settings = await WebsiteHeaderSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: updates,
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
      message: "Website header settings saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};