
import WebsiteFooterSettings from "../models/WebsiteFooterSettings.js";
import InstituteSettings from "../models/InstituteSettings.js";

const DEFAULT_SETTINGS = {
  key: "default",
  instituteDescription:
    "Empowering learners with industry-relevant courses, practical training and career support to build a successful future.",
  columnOneHeading: "Useful Links",
  columnOneLinks: [],
  columnTwoHeading: "Our Company",
  columnTwoLinks: [],
  columnThreeHeading: "Get in Touch",
};

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const getOrCreateSettings = async () => {
  let settings = await WebsiteFooterSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteFooterSettings.create(
      DEFAULT_SETTINGS
    );
  }

  return settings;
};

const isValidFooterUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const url = value.trim();

  // Internal application paths and in-page anchors.
  if (
    url.startsWith("/") &&
    !url.startsWith("//")
  ) {
    return true;
  }

  if (url.startsWith("#")) {
    return true;
  }

  // Allow only safe absolute URL protocols.
  try {
    const parsed = new URL(url);

    return [
      "http:",
      "https:",
      "mailto:",
      "tel:",
    ].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const normalizeLinks = (links, columnName) => {
  if (!Array.isArray(links)) {
    return {
      error: `${columnName} must be an array.`,
    };
  }

  if (links.length > 12) {
    return {
      error: `Maximum 12 links are allowed in ${columnName}.`,
    };
  }

  const normalized = [];

  for (const item of links) {
    const label = String(item?.label || "").trim();
    const url = String(item?.url || "").trim();

    if (!label || label.length > 60) {
      return {
        error: `Every ${columnName} link needs a label between 1 and 60 characters.`,
      };
    }

    if (!isValidFooterUrl(url) || url.length > 500) {
      return {
        error: `Enter a valid URL for "${label}" in ${columnName}.`,
      };
    }

    normalized.push({
      label,
      url,
      openInNewTab: item?.openInNewTab === true,
    });
  }

  return { links: normalized };
};

// ADMIN: GET FOOTER SETTINGS
export const getWebsiteFooterSettings = async (
  req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: UPDATE FOOTER SETTINGS
export const updateWebsiteFooterSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};
    const updates = {};

    const stringFields = [
      "instituteDescription",
      "columnOneHeading",
      "columnTwoHeading",
      "columnThreeHeading",
    ];

    for (const field of stringFields) {
      if (typeof body[field] === "string") {
        updates[field] = body[field].trim();
      }
    }

    const limits = {
      instituteDescription: 500,
      columnOneHeading: 60,
      columnTwoHeading: 60,
      columnThreeHeading: 60,
    };

    for (const [field, maxLength] of Object.entries(limits)) {
      if (
        Object.hasOwn(updates, field) &&
        updates[field].length > maxLength
      ) {
        return sendError(
          res,
          400,
          `${field} cannot exceed ${maxLength} characters.`
        );
      }
    }

    for (const field of [
      "columnOneHeading",
      "columnTwoHeading",
      "columnThreeHeading",
    ]) {
      if (
        Object.hasOwn(updates, field) &&
        !updates[field]
      ) {
        return sendError(
          res,
          400,
          `${field} cannot be empty.`
        );
      }
    }

    if (Object.hasOwn(body, "columnOneLinks")) {
      const result = normalizeLinks(
        body.columnOneLinks,
        "Useful Links"
      );

      if (result.error) {
        return sendError(res, 400, result.error);
      }

      updates.columnOneLinks = result.links;
    }

    if (Object.hasOwn(body, "columnTwoLinks")) {
      const result = normalizeLinks(
        body.columnTwoLinks,
        "Our Company"
      );

      if (result.error) {
        return sendError(res, 400, result.error);
      }

      updates.columnTwoLinks = result.links;
    }

    if (!Object.keys(updates).length) {
      return sendError(
        res,
        400,
        "No valid Footer settings were provided."
      );
    }

    updates.updatedBy = req.user._id;

    const settings = await WebsiteFooterSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: updates,
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
      message: "Footer settings saved successfully.",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUBLIC: GET FOOTER SETTINGS + INSTITUTE DETAILS
export const getPublicWebsiteFooter = async (
  req,
  res,
  next
) => {
  try {
    const [settings, institute] = await Promise.all([
      WebsiteFooterSettings.findOne({
        key: "default",
      }).lean(),

      InstituteSettings.findOne({
        key: "default",
      })
        .select(
          "instituteName logoUrl phone email address city state postalCode country"
        )
        .lean(),
    ]);

    const instituteAddress = [
      institute?.address,
      institute?.city,
      institute?.state,
      institute?.postalCode,
      institute?.country,
    ]
      .filter(Boolean)
      .join(", ");

    return res.status(200).json({
      success: true,
      data: {
        settings: settings || DEFAULT_SETTINGS,
        institute: {
          instituteName: institute?.instituteName || "",
          logoUrl: institute?.logoUrl || "",
          phone: institute?.phone || "",
          email: institute?.email || "",
          address: instituteAddress,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
