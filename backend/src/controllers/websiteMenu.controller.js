
import WebsiteMenuSettings from "../models/WebsiteMenuSettings.js";

const DEFAULT_ITEMS = [
  { key: "home", label: "Home", url: "/", isVisible: true },
  { key: "about", label: "About us", url: "/about", isVisible: true },
  { key: "courses", label: "Courses", url: "/courses", isVisible: true },
  { key: "placements", label: "Placements", url: "/placements", isVisible: true },
  { key: "verification", label: "Verification", url: "/verification", isVisible: true },
  { key: "contact", label: "Contact", url: "/contact", isVisible: true },
  { key: "resources", label: "Resources", url: "/resources", isVisible: true },
];

// !!!!! INSERTION START: MENU VALIDATION ERROR CLASS !!!!!
class MenuValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MenuValidationError";
  }
}
// !!!!! INSERTION END: MENU VALIDATION ERROR CLASS !!!!!

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const isValidUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const url = value.trim();

  // Allow normal internal routes and anchor links.
  if (
    (url.startsWith("/") && !url.startsWith("//")) ||
    url.startsWith("#")
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

const normalizeMenuItem = (item, isChild = false) => {
  const label = String(item?.label || "").trim();
  const url = String(item?.url || "").trim();

  if (!label || label.length > 40) {
    throw new MenuValidationError(
      "Every menu item needs a label between 1 and 40 characters."
    );
  }

  if (!url || url.length > 500 || !isValidUrl(url)) {
    throw new MenuValidationError(
      `Please enter a valid URL for "${label}".`
    );
  }

  const normalized = {
    key: String(item?.key || "").trim(),
    label,
    url,
    isVisible: item?.isVisible !== false,
    openInNewTab: item?.openInNewTab === true,
  };

  if (!normalized.key || normalized.key.length > 100) {
    throw new MenuValidationError(
      "Every menu item needs a valid unique key."
    );
  }

  if (!isChild) {
    const children = Array.isArray(item?.children)
      ? item.children
      : [];

    if (children.length > 15) {
      throw new MenuValidationError(
        `"${label}" can have a maximum of 15 submenu items.`
      );
    }

    normalized.children = children.map((child) =>
      normalizeMenuItem(child, true)
    );
  }

  return normalized;
};

const getOrCreateSettings = async () => {
  let settings = await WebsiteMenuSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteMenuSettings.create({
      key: "default",
      items: DEFAULT_ITEMS,
    });
  }

  return settings;
};

export const getWebsiteMenuSettings = async (
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

export const updateWebsiteMenuSettings = async (
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
        "Menu items must be provided as an array."
      );
    }

    if (body.items.length > 25) {
      return sendError(
        res,
        400,
        "Maximum 25 navigation menu items are allowed."
      );
    }

    const items = body.items.map((item) =>
      normalizeMenuItem(item)
    );

    // Menu keys must be unique across top-level and child items.
    const keys = [];

    items.forEach((item) => {
      keys.push(item.key);
      item.children.forEach((child) => keys.push(child.key));
    });

    if (new Set(keys).size !== keys.length) {
      return sendError(
        res,
        400,
        "Menu item keys must be unique."
      );
    }

    const settings = await WebsiteMenuSettings.findOneAndUpdate(
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

    return res.status(200).json({
      success: true,
      message: "Website navigation menu saved successfully.",
      data: { settings },
    });
  } catch (error) {
    // !!!!! INSERTION START: DISTINGUISH VALIDATION ERRORS FROM SERVER ERRORS !!!!!
    if (error instanceof MenuValidationError) {
      return sendError(res, 400, error.message);
    }
    // !!!!! INSERTION END: DISTINGUISH VALIDATION ERRORS FROM SERVER ERRORS !!!!!

    return next(error);
  }
};
