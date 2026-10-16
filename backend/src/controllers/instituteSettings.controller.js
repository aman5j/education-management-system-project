
import InstituteSettings from "../models/InstituteSettings.js";

const DEFAULT_SETTINGS = {
  key: "default",
  instituteName: "India Tech Samadhaan",
  legalName: "",
  registrationNumber: "",
  logoUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getOrCreateSettings = async () => {
  let settings = await InstituteSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await InstituteSettings.create(DEFAULT_SETTINGS);
  }

  return settings;
};

export const getInstituteSettings = async (_req, res, next) => {
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

export const updateInstituteSettings = async (req, res, next) => {
  try {
    
const fields = [
  "instituteName",
  "legalName",
  "registrationNumber",
  "designation",
  "email",
  "phone",
  "alternatePhone",
  "website",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "controllerName",
  "controllerDesignation",
  "controllerEmployeeId",
  "controllerEmail",
  "controllerPhone",
  "ownerName",
];


    const updates = {};

    for (const field of fields) {
      if (typeof req.body[field] === "string") {
        updates[field] = req.body[field].trim();
      }
    }

    const currentName = updates.instituteName;

    if (
      typeof currentName !== "string" ||
      currentName.length < 2 ||
      currentName.length > 150
    ) {
      return sendError(
        res,
        400,
        "Institute name must contain between 2 and 150 characters."
      );
    }

    if (
      updates.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)
    ) {
      return sendError(res, 400, "Enter a valid institute email address.");
    }

    if (updates.website) {
      try {
        const parsedUrl = new URL(updates.website);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Unsupported protocol");
        }
      } catch {
        return sendError(
          res,
          400,
          "Enter a valid website URL beginning with http:// or https://."
        );
      }
    }

    updates.updatedBy = req.user._id;

    const settings = await InstituteSettings.findOneAndUpdate(
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
      message: "Institute settings saved successfully.",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadInstituteLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, "Please select a logo image.");
    }

    const logoUrl = `/uploads/institute/${req.file.filename}`;

    const settings = await InstituteSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          logoUrl,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          key: "default",
          instituteName: DEFAULT_SETTINGS.instituteName,
          country: DEFAULT_SETTINGS.country,
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
      message: "Institute logo uploaded successfully.",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};
