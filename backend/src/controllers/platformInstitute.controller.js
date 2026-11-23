
import mongoose from "mongoose";

import { getPlatformConnection } from "../config/platformDb.js";
import getInstituteModel from "../models/Institute.js";

const getInstituteModelInstance = () => {
  return getInstituteModel(getPlatformConnection());
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value) =>
  normalizeText(value).toLowerCase();

const createSlug = (value) =>
  normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isValidDomain = (value) => {
  if (!value) return true;

  if (
    value.length > 253 ||
    value.includes("://") ||
    value.includes("/") ||
    value.includes("@") ||
    value.includes(" ")
  ) {
    return false;
  }

  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
    value
  );
};

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

const getSafeInstitute = (institute) => ({
  id: String(institute._id),
  name: institute.name,
  slug: institute.slug,
  contactEmail: institute.contactEmail,
  phone: institute.phone,
  databaseName: institute.databaseName,
  domain: institute.domain,
  status: institute.status,
  provisioningStatus: institute.provisioningStatus,
  provisionedAt: institute.provisionedAt,
  createdAt: institute.createdAt,
  updatedAt: institute.updatedAt,
});

// GET /api/platform/institutes
export const getInstitutes = async (req, res, next) => {
  try {
    const Institute = getInstituteModelInstance();

    const {
      search = "",
      status = "",
      provisioningStatus = "",
      page = 1,
      limit = 10,
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {};

    if (
      status &&
      ["active", "suspended", "deactivated"].includes(status)
    ) {
      filter.status = status;
    } else if (status) {
      return sendValidationError(res, "Invalid institute status.");
    }

    if (
      provisioningStatus &&
      ["pending", "provisioning", "ready", "failed"].includes(
        provisioningStatus
      )
    ) {
      filter.provisioningStatus = provisioningStatus;
    } else if (provisioningStatus) {
      return sendValidationError(
        res,
        "Invalid provisioning status."
      );
    }

    const searchText = normalizeText(String(search));

    if (searchText) {
      const escaped = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { name: regex },
        { slug: regex },
        { contactEmail: regex },
        { phone: regex },
        { domain: regex },
      ];
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const skip = (pageNumber - 1) * limitNumber;

    const [institutes, total] = await Promise.all([
      Institute.find(filter)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Institute.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        institutes,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/platform/institutes
export const createInstitute = async (req, res, next) => {
  try {
    const Institute = getInstituteModelInstance();

    const name = normalizeText(req.body.name);
    const contactEmail = normalizeEmail(req.body.contactEmail);
    const phone = normalizeText(req.body.phone);
    const requestedSlug = normalizeText(req.body.slug);
    const domain = normalizeText(req.body.domain).toLowerCase();

    if (!name || name.length < 2 || name.length > 150) {
      return sendValidationError(
        res,
        "Institute name must contain between 2 and 150 characters."
      );
    }

    if (!contactEmail || contactEmail.length > 254) {
      return sendValidationError(
        res,
        "A valid contact email is required."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return sendValidationError(
        res,
        "Please enter a valid contact email."
      );
    }

    if (phone.length > 25) {
      return sendValidationError(
        res,
        "Phone number cannot exceed 25 characters."
      );
    }

    if (!isValidDomain(domain)) {
      return sendValidationError(
        res,
        "Enter a valid domain without https:// or a path."
      );
    }

    const slug = createSlug(requestedSlug || name);

    if (!slug || slug.length > 150) {
      return sendValidationError(
        res,
        "A valid institute slug is required."
      );
    }

    const duplicateConditions = [
      { slug },
      { contactEmail },
    ];

    if (domain) duplicateConditions.push({ domain });

    const duplicate = await Institute.findOne({
      $or: duplicateConditions,
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "An institute with the same slug, email or domain already exists.",
      });
    }

    // The database name is generated by the backend.
    // The browser cannot select or overwrite a tenant database.
    const newId = new mongoose.Types.ObjectId();

    const databaseName = `ems_institute_${newId.toString()}`;

    const institute = await Institute.create({
      _id: newId,
      name,
      slug,
      contactEmail,
      phone,
      domain,

      databaseName,

      // Do not permit login before Phase 3 provisions the DB.
      status: "suspended",
      provisioningStatus: "pending",
      provisionedAt: null,
    });

    return res.status(201).json({
      success: true,
      message:
        "Institute registered. Database provisioning is pending.",
      data: {
        institute: getSafeInstitute(institute),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An institute with the same unique information already exists.",
      });
    }

    next(error);
  }
};

// GET /api/platform/institutes/:id
export const getInstituteById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institute ID.",
      });
    }

    const Institute = getInstituteModelInstance();

    const institute = await Institute.findById(req.params.id).lean();

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { institute },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/platform/institutes/:id
export const updateInstitute = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institute ID.",
      });
    }

    const Institute = getInstituteModelInstance();

    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found.",
      });
    }

    const allowedFields = [
      "name",
      "contactEmail",
      "phone",
      "slug",
      "domain",
    ];

    const suppliedFields = allowedFields.filter(
      (field) =>
        Object.prototype.hasOwnProperty.call(req.body, field)
    );

    if (!suppliedFields.length) {
      return sendValidationError(
        res,
        "No editable institute fields were provided."
      );
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = normalizeText(req.body.name);

      if (name.length < 2 || name.length > 150) {
        return sendValidationError(
          res,
          "Institute name must contain between 2 and 150 characters."
        );
      }

      institute.name = name;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "contactEmail"
      )
    ) {
      const email = normalizeEmail(req.body.contactEmail);

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254
      ) {
        return sendValidationError(
          res,
          "Please enter a valid contact email."
        );
      }

      institute.contactEmail = email;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
      const phone = normalizeText(req.body.phone);

      if (phone.length > 25) {
        return sendValidationError(
          res,
          "Phone number cannot exceed 25 characters."
        );
      }

      institute.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "slug")) {
      const slug = createSlug(req.body.slug);

      if (!slug || slug.length > 150) {
        return sendValidationError(
          res,
          "Please enter a valid institute slug."
        );
      }

      institute.slug = slug;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "domain")) {
      const domain = normalizeText(req.body.domain).toLowerCase();

      if (!isValidDomain(domain)) {
        return sendValidationError(
          res,
          "Enter a valid domain without https:// or a path."
        );
      }

      institute.domain = domain;
    }

    const duplicateConditions = [
      { slug: institute.slug, _id: { $ne: institute._id } },
      {
        contactEmail: institute.contactEmail,
        _id: { $ne: institute._id },
      },
    ];

    if (institute.domain) {
      duplicateConditions.push({
        domain: institute.domain,
        _id: { $ne: institute._id },
      });
    }

    const duplicate = await Institute.findOne({
      $or: duplicateConditions,
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Another institute already uses this slug, email or domain.",
      });
    }

    // databaseName, status and provisioning fields are deliberately
    // not editable through this profile endpoint.
    await institute.save();

    return res.status(200).json({
      success: true,
      message: "Institute details updated successfully.",
      data: {
        institute: getSafeInstitute(institute),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An institute with this unique value already exists.",
      });
    }

    next(error);
  }
};

// PATCH /api/platform/institutes/:id/status
export const updateInstituteStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid institute ID.",
      });
    }

    const { status } = req.body;

    if (!["active", "suspended", "deactivated"].includes(status)) {
      return sendValidationError(
        res,
        "Status must be active, suspended or deactivated."
      );
    }

    const Institute = getInstituteModelInstance();

    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found.",
      });
    }

    if (
      status === "active" &&
      institute.provisioningStatus !== "ready"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This institute cannot be activated until database provisioning is complete.",
      });
    }

    institute.status = status;
    await institute.save();

    return res.status(200).json({
      success: true,
      message: `Institute ${status} successfully.`,
      data: {
        institute: getSafeInstitute(institute),
      },
    });
  } catch (error) {
    next(error);
  }
};
