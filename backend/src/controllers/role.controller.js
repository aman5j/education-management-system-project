
import Role from "../models/Role.js";
import User from "../models/User.js";
import { ALL_PERMISSION_KEYS } from "../constants/permissions.js";

const allowedPermissions = new Set(ALL_PERMISSION_KEYS);

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return {
      valid: false,
      message: "Permissions must be an array.",
    };
  }

  const normalized = [...new Set(permissions)];

  const invalidPermissions = normalized.filter(
    (permission) =>
      typeof permission !== "string" ||
      !allowedPermissions.has(permission)
  );

  if (invalidPermissions.length > 0) {
    return {
      valid: false,
      message: "One or more permissions are invalid.",
    };
  }

  return {
    valid: true,
    permissions: normalized,
  };
};

const serializeRole = (role) => ({
  id: role._id.toString(),
  name: role.name,
  label: role.label,
  description: role.description || "",
  permissions: role.permissions || [],
  isActive: role.isActive,
  isSystem: role.isSystem,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

// GET /api/roles
export const listRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({
      roleType: "staff",
      isSystem: false,
    })
      .sort({ label: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: roles.map((role) => ({
        id: role._id.toString(),
        name: role.name,
        label: role.label,
        description: role.description || "",
        permissions: role.permissions || [],
        isActive: role.isActive,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/roles/permissions
// export const listAvailablePermissions = async (req, res) => {
//   return res.status(200).json({
//     success: true,
//     data: ALL_PERMISSION_KEYS,
//   });
// };


export const listAvailablePermissions = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: ALL_PERMISSION_KEYS,
    });
  } catch (error) {
    return next(error);
  }
};


// POST /api/roles
export const createRole = async (req, res, next) => {
  try {
    const { name, label, description, permissions } = req.body;

    if (
      typeof name !== "string" ||
      typeof label !== "string" ||
      !name.trim() ||
      !label.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Role name and label are required.",
      });
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedLabel = label.trim();

    if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(normalizedName)) {
      return res.status(400).json({
        success: false,
        message:
          "Role name may contain lowercase letters, numbers, hyphens, and underscores.",
      });
    }

    if (normalizedLabel.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Role label cannot exceed 80 characters.",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 300)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be text with at most 300 characters.",
      });
    }

    const permissionResult = normalizePermissions(
      permissions === undefined ? [] : permissions
    );

    if (!permissionResult.valid) {
      return res.status(400).json({
        success: false,
        message: permissionResult.message,
      });
    }

    const existingRole = await Role.findOne({
      name: normalizedName,
    }).select("_id");

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "A role with this name already exists.",
      });
    }

    const role = await Role.create({
      name: normalizedName,
      label: normalizedLabel,
      description: description?.trim() || "",
      permissions: permissionResult.permissions,
      roleType: "staff",
      isSystem: false,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Staff role created successfully.",
      data: serializeRole(role),
    });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/roles/:id
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, description, permissions, isActive } = req.body;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    const role = await Role.findById(id);

    if (!role || role.roleType !== "staff" || role.isSystem) {
      return res.status(404).json({
        success: false,
        message: "Staff role not found.",
      });
    }

    if (label !== undefined) {
      if (
        typeof label !== "string" ||
        !label.trim() ||
        label.trim().length > 80
      ) {
        return res.status(400).json({
          success: false,
          message: "Role label must contain 1–80 characters.",
        });
      }

      role.label = label.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.length > 300
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 300 characters.",
        });
      }

      role.description = description.trim();
    }

    if (permissions !== undefined) {
      const permissionResult = normalizePermissions(permissions);

      if (!permissionResult.valid) {
        return res.status(400).json({
          success: false,
          message: permissionResult.message,
        });
      }

      role.permissions = permissionResult.permissions;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be a boolean.",
        });
      }

      // Do not deactivate a role while it is still assigned.
      // Reassign its users first, then deactivate it.
      if (isActive === false) {
        const assignedUsers = await User.exists({
          assignedRole: role._id,
          role: "staff",
        });

        if (assignedUsers) {
          return res.status(409).json({
            success: false,
            message:
              "This role is assigned to staff. Reassign those accounts before deactivating it.",
          });
        }
      }

      role.isActive = isActive;
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Staff role updated successfully.",
      data: serializeRole(role),
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/roles/:id
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    const role = await Role.findById(id);

    if (!role || role.roleType !== "staff" || role.isSystem) {
      return res.status(404).json({
        success: false,
        message: "Staff role not found.",
      });
    }

    const assignedUsers = await User.exists({
      assignedRole: role._id,
      role: "staff",
    });

    if (assignedUsers) {
      return res.status(409).json({
        success: false,
        message:
          "This role is assigned to staff. Reassign those accounts before deleting it.",
      });
    }

    await Role.deleteOne({ _id: role._id });

    return res.status(200).json({
      success: true,
      message: "Staff role deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};
