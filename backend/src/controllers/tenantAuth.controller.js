
import {
  createTenantAccessToken,
  createTenantRefreshToken,
  verifyTenantRefreshToken,
  hashTenantToken,
  safeTenantHashMatch,
  sanitizeTenantUser,
} from "../utils/tenantAuth.js";

const COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "ems_tenant_refresh_token";

const REFRESH_COOKIE_PATH = "/api/tenant/auth";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: REFRESH_COOKIE_PATH,
  };
};

const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  };
};

const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions());
};

const getTenantUserModel = (req) => {
  const User = req.tenantModels?.User;

  if (!User) {
    throw new Error("Tenant User model is unavailable.");
  }

  return User;
};

const getTenantRole = (role) =>
  ["admin", "staff", "student"].includes(role);

export const tenantLogin = async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};

    if (!getTenantRole(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a valid portal: Admin, Staff, or Student.",
      });
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const User = getTenantUserModel(req);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    })
      .select("+password +refreshTokenHash")
      .populate({
        path: "assignedRole",
        select: "name label permissions isActive roleType isSystem",
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message:
          "The selected portal does not match this account.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is suspended. Contact your institute administrator.",
      });
    }

    const passwordMatched =
      await user.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const accessToken = createTenantAccessToken(
      user,
      req.tenantContext
    );

    const refreshToken = createTenantRefreshToken(
      user,
      req.tenantContext
    );

    user.refreshTokenHash = hashTenantToken(refreshToken);
    user.lastLoginAt = new Date();

    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Institute login successful.",
      data: {
        accessToken,
        user: sanitizeTenantUser(user),
        institute: {
          id: req.tenant.id,
          name: req.tenant.name,
          slug: req.tenant.slug,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const tenantRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Institute refresh token not found.",
      });
    }

    let decoded;

    try {
      decoded = verifyTenantRefreshToken(refreshToken);
    } catch {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Institute session expired or invalid.",
      });
    }

    if (
      decoded.type !== "refresh" ||
      decoded.instituteId !== req.tenantContext.instituteId ||
      decoded.tenantKey !== req.tenantContext.collectionPrefix
    ) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        code: "TENANT_REFRESH_TOKEN_MISMATCH",
        message:
          "This refresh session does not belong to the current institute.",
      });
    }

    const User = getTenantUserModel(req);

    const user = await User.findById(decoded.sub)
      .select("+refreshTokenHash")
      .populate({
        path: "assignedRole",
        select: "name label permissions isActive roleType isSystem",
      });

    if (!user || user.status !== "active") {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Institute account is unavailable.",
      });
    }

    if (
      !safeTenantHashMatch(
        user.refreshTokenHash,
        refreshToken
      )
    ) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Institute session is no longer valid.",
      });
    }

    const remainingSeconds =
      decoded.exp - Math.floor(Date.now() / 1000);

    if (remainingSeconds <= 0) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Institute session has expired.",
      });
    }

    const remainingLifetime = `${remainingSeconds}s`;

    const newAccessToken = createTenantAccessToken(
      user,
      req.tenantContext,
      remainingLifetime
    );

    const newRefreshToken = createTenantRefreshToken(
      user,
      req.tenantContext,
      remainingLifetime
    );

    user.refreshTokenHash = hashTenantToken(newRefreshToken);
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: sanitizeTenantUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const tenantLogout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[COOKIE_NAME];

    if (refreshToken) {
      try {
        const decoded = verifyTenantRefreshToken(refreshToken);

        if (
          decoded.type === "refresh" &&
          decoded.instituteId === req.tenantContext.instituteId &&
          decoded.tenantKey === req.tenantContext.collectionPrefix
        ) {
          const User = getTenantUserModel(req);

          const user = await User.findById(decoded.sub)
            .select("+refreshTokenHash");

          if (
            user &&
            safeTenantHashMatch(
              user.refreshTokenHash,
              refreshToken
            )
          ) {
            user.refreshTokenHash = null;
            await user.save();
          }
        }
      } catch {
        // Always clear the browser cookie, even if expired.
      }
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Institute logout successful.",
    });
  } catch (error) {
    return next(error);
  }
};

export const tenantMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeTenantUser(req.tenantUser),
      institute: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
      },
    },
  });
};

export const tenantChangePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain between 8 and 128 characters.",
      });
    }

    const User = getTenantUserModel(req);

    const user = await User.findById(req.tenantUser._id)
      .select("+password +refreshTokenHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Institute account not found.",
      });
    }

    const matched = await user.comparePassword(currentPassword);

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    user.refreshTokenHash = null;

    await user.save();

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message:
        "Password changed. Please sign in again.",
    });
  } catch (error) {
    return next(error);
  }
};
