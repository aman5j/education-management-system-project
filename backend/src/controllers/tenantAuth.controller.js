
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

const PLATFORM_COOKIE_NAME =
  process.env.PLATFORM_COOKIE_NAME || "ems_platform_refresh_token";

const LEGACY_COOKIE_NAME =
  process.env.COOKIE_NAME || "ems_refresh_token";

if (
  COOKIE_NAME === PLATFORM_COOKIE_NAME ||
  COOKIE_NAME === LEGACY_COOKIE_NAME
) {
  throw new Error(
    "Tenant, platform and legacy refresh cookie names must be different."
  );
}

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
  if (
    typeof req.getTenantModel !== "function" ||
    !req.tenantContext?.instituteId
  ) {
    throw new Error(
      "Tenant model accessor or context is unavailable."
    );
  }

  return req.getTenantModel("User");
};


const getTenantRole = (role) =>
  ["admin", "staff", "student"].includes(role);

const isValidEmail = (email) =>
  typeof email === "string" &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getTenantAccountResponse = (req) => ({
  id: req.tenant.id,
  name: req.tenant.name,
  slug: req.tenant.slug,
});

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
      !isValidEmail(email) ||
      typeof password !== "string" ||
      !password ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address and password.",
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
        message: "The selected portal does not match this account.",
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
        institute: getTenantAccountResponse(req),
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
        code: "TENANT_REFRESH_REQUIRED",
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
        code: "TENANT_REFRESH_INVALID",
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

    const remainingSeconds =
      decoded.exp - Math.floor(Date.now() / 1000);

    if (remainingSeconds <= 0) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        code: "TENANT_REFRESH_EXPIRED",
        message: "Institute session has expired.",
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
        code: "TENANT_REFRESH_REUSED",
        message: "Institute session is no longer valid.",
      });
    }

    const newAccessToken = createTenantAccessToken(
      user,
      req.tenantContext
    );

    const newRefreshToken = createTenantRefreshToken(
      user,
      req.tenantContext,
      `${remainingSeconds}s`
    );

    const rotatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        status: "active",
        refreshTokenHash: hashTenantToken(refreshToken),
      },
      {
        $set: {
          refreshTokenHash: hashTenantToken(newRefreshToken),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate({
      path: "assignedRole",
      select: "name label permissions isActive roleType isSystem",
    });

    if (!rotatedUser) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        code: "TENANT_REFRESH_REUSED",
        message: "Institute session is no longer valid.",
      });
    }

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: sanitizeTenantUser(rotatedUser),
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

          await User.updateOne(
            {
              _id: decoded.sub,
              refreshTokenHash: hashTenantToken(refreshToken),
            },
            {
              $set: { refreshTokenHash: null },
            }
          );
        }
      } catch {
        // Always clear this tenant's browser cookie.
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
      institute: getTenantAccountResponse(req),
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
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter your current password and a new password between 8 and 128 characters.",
      });
    }

    const User = getTenantUserModel(req);

    const user = await User.findById(req.tenantUser._id)
      .select("+password +refreshTokenHash");

    if (!user || user.status !== "active") {
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
      message: "Password changed. Please sign in again.",
    });
  } catch (error) {
    return next(error);
  }
};
