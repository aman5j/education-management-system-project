import WebsiteContactSettings from "../models/WebsiteContactSettings.js";
import InstituteSettings from "../models/InstituteSettings.js";
import Course from "../models/Course.js";

const DEFAULT_SETTINGS = {
  key: "default",
  enabled: true,
  heading: "Get in Touch",
  description:
    "Have a question? Send us a message and our team will help you.",
};

const fail = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const getOrCreateSettings = async () => {
  let settings = await WebsiteContactSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteContactSettings.create(
      DEFAULT_SETTINGS
    );
  }

  return settings;
};

// GET ADMIN CONTACT SETTINGS
export const getWebsiteContactSettings = async (
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

// UPDATE ADMIN CONTACT SETTINGS
export const updateWebsiteContactSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (typeof body.enabled === "boolean") {
      updates.enabled = body.enabled;
    }

    if (typeof body.heading === "string") {
      updates.heading = body.heading.trim();
    }

    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }

    if (
      Object.hasOwn(updates, "heading") &&
      (!updates.heading || updates.heading.length > 100)
    ) {
      return fail(
        res,
        400,
        "Heading is required and cannot exceed 100 characters."
      );
    }

    if (
      Object.hasOwn(updates, "description") &&
      (!updates.description ||
        updates.description.length > 500)
    ) {
      return fail(
        res,
        400,
        "Description is required and cannot exceed 500 characters."
      );
    }

    if (!Object.keys(updates).length) {
      return fail(
        res,
        400,
        "No valid Contact Us settings provided."
      );
    }

    updates.updatedBy = req.user._id;

    const settings = await WebsiteContactSettings.findOneAndUpdate(
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
      message: "Contact Us settings saved successfully.",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};


// PUBLIC CONTACT US DATA
export const getPublicContactData = async (req, res, next) => {
  try {
    const [settings, institute, courses] = await Promise.all([
      WebsiteContactSettings.findOne({
        key: "default",
      }).lean(),

      InstituteSettings.findOne({
        key: "default",
      })
        .select("instituteName email phone")
        .lean(),

      // Match Published regardless of capitalization or surrounding spaces.
      Course.find({
        status: {
          $regex: /^\s*published\s*$/i,
        },
      })
        .select("_id courseTitle courseType courseCategory status")
        .sort({
          displayOrder: 1,
          courseTitle: 1,
        })
        .lean(),
    ]);

    const publishedCourses = Array.isArray(courses)
      ? courses.map((course) => ({
          _id: course._id,
          courseTitle: course.courseTitle,
          courseType: course.courseType,
          courseCategory: course.courseCategory,
        }))
      : [];

    return res.status(200).json({
      success: true,
      data: {
        settings: settings || DEFAULT_SETTINGS,

        contact: {
          instituteName: institute?.instituteName || "",
          email: institute?.email || "",
          phone: institute?.phone || "",
        },

        courses: publishedCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};
