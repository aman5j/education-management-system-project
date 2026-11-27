
import crypto from "node:crypto";

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
  res.status(status).json({
    success: false,
    message,
  });

const getModels = (req) => {
  if (typeof req.getTenantModel !== "function") {
    throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
  }

  return {
    InstituteSettings: req.getTenantModel("InstituteSettings"),
    InstituteLogo: req.getTenantModel("InstituteLogo"),
  };
};

const getOrCreateSettings = async (InstituteSettings) => {
  let settings = await InstituteSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await InstituteSettings.create(DEFAULT_SETTINGS);
  }

  return settings;
};

const detectLogoMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

export const getTenantInstituteSettings = async (
  req,
  res,
  next
) => {
  try {
    const { InstituteSettings } = getModels(req);

    const settings = await getOrCreateSettings(
      InstituteSettings
    );

    return res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantPublicInstituteBranding = async (
  req,
  res,
  next
) => {
  try {
    const { InstituteSettings } = getModels(req);

    const settings = await InstituteSettings.findOne({
      key: "default",
    })
      .select("logoUrl")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        branding: {
          logoUrl: settings?.logoUrl || "",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantInstituteSettings = async (
  req,
  res,
  next
) => {
  try {
    const { InstituteSettings } = getModels(req);

    const updates = {};

    for (const field of EDITABLE_FIELDS) {
      if (typeof req.body?.[field] === "string") {
        updates[field] = req.body[field].trim();
      }
    }

    for (const field of BOOLEAN_FIELDS) {
      if (typeof req.body?.[field] === "boolean") {
        updates[field] = req.body[field];
      }
    }

    if (
      Object.hasOwn(updates, "instituteName") &&
      updates.instituteName.length > 0 &&
      (
        updates.instituteName.length < 2 ||
        updates.instituteName.length > 150
      )
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
        return sendError(
          res,
          400,
          `Enter a valid ${
            field === "email" ? "institute" : "controller"
          } email address.`
        );
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
      return sendError(
        res,
        400,
        "No editable settings were provided."
      );
    }

    updates.updatedBy = req.tenantUser._id;

    const settings =
      await InstituteSettings.findOneAndUpdate(
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
      message:
        "Institute and certificate settings saved successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadTenantInstituteLogo = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file?.buffer) {
      return sendError(
        res,
        400,
        "Please select an institute logo."
      );
    }

    const detectedMimeType = detectLogoMimeType(
      req.file.buffer
    );

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

    const { InstituteSettings, InstituteLogo } =
      getModels(req);

    const version = crypto.randomUUID();

    await InstituteLogo.create({
      version,
      contentType: detectedMimeType,
      data: req.file.buffer,
      size: req.file.size,
      updatedBy: req.tenantUser._id,
    });

    const logoUrl =
      `/api/tenant/institute-settings/logo/${version}`;

    const settings =
      await InstituteSettings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            logoUrl,
            updatedBy: req.tenantUser._id,
          },
          $setOnInsert: { key: "default" },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    const olderLogos = await InstituteLogo.find({
      version: { $ne: version },
    })
      .sort({ createdAt: -1 })
      .skip(4)
      .select("_id")
      .lean();

    if (olderLogos.length) {
      await InstituteLogo.deleteMany({
        _id: {
          $in: olderLogos.map((item) => item._id),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Institute logo uploaded successfully.",
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantInstituteLogo = async (
  req,
  res,
  next
) => {
  try {
    const { InstituteLogo } = getModels(req);

    const logo = await InstituteLogo.findOne({
      version: req.params.version,
    }).select("version contentType data size");

    if (!logo) {
      return res.status(404).json({
        success: false,
        message: "Institute logo not found.",
      });
    }

    const rawData = logo.data;

    let imageBuffer;

    if (Buffer.isBuffer(rawData)) {
      imageBuffer = rawData;
    } else if (rawData?.buffer) {
      const binaryBuffer = Buffer.from(rawData.buffer);

      const actualLength = Number.isInteger(rawData.position)
        ? rawData.position
        : binaryBuffer.length;

      imageBuffer = binaryBuffer.subarray(0, actualLength);
    } else if (
      rawData &&
      typeof rawData.value === "function"
    ) {
      imageBuffer = Buffer.from(rawData.value(true));
    } else {
      imageBuffer = Buffer.from(rawData || []);
    }

    if (!imageBuffer.length) {
      return res.status(500).json({
        success: false,
        message: "Institute logo data is empty or invalid.",
      });
    }

    const etag = `"${logo.version}"`;

    res.set({
      "Content-Type": logo.contentType,
      "Content-Length": String(imageBuffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    });

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    return res.status(200).end(imageBuffer);
  } catch (error) {
    next(error);
  }
};
