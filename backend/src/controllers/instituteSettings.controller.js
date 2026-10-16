
import InstituteSettings from "../models/InstituteSettings.js";

const DEFAULT_SETTINGS = {
  key: "default",
  instituteName: "",
  legalName: "",
  registrationNumber: "",
  designation: "",
  logoUrl: "",
  stampUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  controllerName: "",
  controllerDesignation: "Examination Controller",
  controllerEmployeeId: "",
  controllerEmail: "",
  controllerPhone: "",
  controllerSignatureUrl: "",
  showControllerNameOnCertificate: true,
  showControllerSignatureOnCertificate: true,
  ownerName: "",
  ownerPhotoUrl: "",
  ownerSignatureUrl: "",
  showOwnerOnCertificate: false,
};

const EDITABLE_FIELDS = [
  "instituteName",
  "legalName",
  "registrationNumber",
  "designation",
  "email",
  "phone",
  "alternatePhone",
  "website",
  "address",
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

const BOOLEAN_FIELDS = [
  "showControllerNameOnCertificate",
  "showControllerSignatureOnCertificate",
  "showOwnerOnCertificate",
];

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const getOrCreateSettings = async () => {
  let settings = await InstituteSettings.findOne({ key: "default" });

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
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const updateInstituteSettings = async (req, res, next) => {
  try {
    const updates = {};

    for (const field of EDITABLE_FIELDS) {
      if (typeof req.body[field] === "string") {
        updates[field] = req.body[field].trim();
      }
    }

    for (const field of BOOLEAN_FIELDS) {
      if (typeof req.body[field] === "boolean") {
        updates[field] = req.body[field];
      }
    }

    if (
      Object.hasOwn(updates, "instituteName") &&
      updates.instituteName.length > 0 &&
      (updates.instituteName.length < 2 ||
        updates.instituteName.length > 150)
    ) {
      return sendError(
        res,
        400,
        "Institute name must contain between 2 and 150 characters."
      );
    }

    for (const field of ["email", "controllerEmail"]) {
      if (
        updates[field] &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates[field])
      ) {
        return sendError(res, 400, `Enter a valid ${field === "email" ? "institute" : "controller"} email address.`);
      }
    }

    if (updates.website) {
      try {
        const url = new URL(updates.website);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return sendError(
          res,
          400,
          "Enter a valid website URL beginning with http:// or https://."
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No editable settings were provided.");
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
      message: "Institute and certificate settings saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

const saveImageUrl = async (req, res, fieldName, label) => {
  if (!req.file) {
    return sendError(res, 400, `Please select a ${label} image.`);
  }

  const imageUrl = `/uploads/institute/${req.file.filename}`;

  const settings = await InstituteSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        [fieldName]: imageUrl,
        updatedBy: req.user._id,
      },
      $setOnInsert: DEFAULT_SETTINGS,
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
    message: `${label} uploaded successfully.`,
    data: { settings },
  });
};

export const uploadInstituteLogo = async (req, res, next) => {
  try {
    return await saveImageUrl(req, res, "logoUrl", "Institute logo");
  } catch (error) {
    next(error);
  }
};

export const uploadInstituteSettingsAsset = async (req, res, next) => {
  try {
    const assetFields = {
      stamp: { field: "stampUrl", label: "Institute stamp" },
      controllerSignature: {
        field: "controllerSignatureUrl",
        label: "Controller signature",
      },
      ownerPhoto: { field: "ownerPhotoUrl", label: "Owner photo" },
      ownerSignature: {
        field: "ownerSignatureUrl",
        label: "Owner signature",
      },
    };

    const asset = assetFields[req.params.assetType];

    if (!asset) {
      return sendError(res, 400, "Unsupported image type.");
    }

    return await saveImageUrl(req, res, asset.field, asset.label);
  } catch (error) {
    next(error);
  }
};


