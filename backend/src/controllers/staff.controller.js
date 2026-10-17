
import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { sanitizeUser } from "../utils/auth.js";

const serializeStaff = (user) => {
  const safeUser = sanitizeUser(user);

  return {
    ...safeUser,
    assignedRole: user.assignedRole
      ? {
          id: user.assignedRole._id.toString(),
          name: user.assignedRole.name,
          label: user.assignedRole.label,
          permissions: user.assignedRole.permissions || [],
          isActive: user.assignedRole.isActive,
        }
      : null,
  };
};

// GET /api/staff
export const listStaff = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter = { role: "staff" };

    if (status && ["active", "suspended"].includes(status)) {
      filter.status = status;
    }

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshTokenHash -passwordResetTokenHash -passwordResetExpires")
        .populate({
          path: "assignedRole",
          select: "name label permissions isActive roleType isSystem",
        })
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        staff: users.map((user) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
          status: user.status,
          assignedRole: user.assignedRole
            ? {
                id: user.assignedRole._id.toString(),
                name: user.assignedRole.name,
                label: user.assignedRole.label,
                isActive: user.assignedRole.isActive,
              }
            : null,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/staff
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone = "", assignedRoleId } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 2–100 characters.",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Initial password must contain at least 12 characters.",
      });
    }

    if (typeof phone !== "string" || phone.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be text with at most 30 characters.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assignedRoleId)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid staff role.",
      });
    }

    const role = await Role.findOne({
      _id: assignedRoleId,
      roleType: "staff",
      isSystem: false,
      isActive: true,
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "The selected staff role does not exist or is inactive.",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail })
      .select("_id")
      .lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone.trim(),
      role: "staff",
      assignedRole: role._id,
      status: "active",
      createdBy: req.user._id,
    });

    const safeUser = await User.findById(user._id).populate({
      path: "assignedRole",
      select: "name label permissions isActive roleType isSystem",
    });

    return res.status(201).json({
      success: true,
      message: "Staff account created successfully.",
      data: serializeStaff(safeUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return next(error);
  }
};




const isValidStaffId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

// PATCH /api/staff/:id/status
export const updateStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidStaffId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff account ID.",
      });
    }

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or suspended.",
      });
    }

    const staff = await User.findOne({
      _id: id,
      role: "staff",
    }).select("+refreshTokenHash");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
    }

    staff.status = status;

    // Revoke the refresh token when suspending the account.
    if (status === "suspended") {
      staff.refreshTokenHash = null;
    }

    await staff.save();

    return res.status(200).json({
      success: true,
      message:
        status === "suspended"
          ? "Staff account suspended successfully."
          : "Staff account activated successfully.",
      data: {
        id: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        status: staff.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/staff/:id/password
export const resetStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!isValidStaffId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff account ID.",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 12–128 characters.",
      });
    }

    const staff = await User.findOne({
      _id: id,
      role: "staff",
    }).select("+refreshTokenHash");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
    }

    staff.password = newPassword;
    staff.refreshTokenHash = null;

    await staff.save();

    return res.status(200).json({
      success: true,
      message:
        "Staff password reset successfully. Share the new temporary password securely.",
    });
  } catch (error) {
    return next(error);
  }
};
