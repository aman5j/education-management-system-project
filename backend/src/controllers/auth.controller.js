import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";

import {
  ROLES,
  ACCOUNT_STATUS,
  createAccessToken,
  createRefreshToken,
  generateRandomToken,
  hashToken,
  sanitizeUser,
} from "../utils/auth.js";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
};

const clearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
  };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(
    process.env.COOKIE_NAME || "ems_refresh_token",
    refreshToken,
    getCookieOptions()
  );
};

const clearRefreshCookie = (res) => {
  res.clearCookie(
    process.env.COOKIE_NAME || "ems_refresh_token",
    clearCookieOptions()
  );
};

const buildAuthResponse = (user) => {
  const accessToken = createAccessToken(user);

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

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
      phone: phone || "",
      role: ROLES.STUDENT,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    return res.status(201).json({
      success: true,
      message: "Student account created successfully.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password +refreshTokenHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Please contact the administrator.",
      });
    }

    const passwordMatched = await user.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken);
    user.lastLoginAt = new Date();

    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "ems_refresh_token";

    const refreshToken = req.cookies[cookieName];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found.",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(decoded.sub).select("+refreshTokenHash");

    if (!user) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      clearRefreshCookie(res);

      return res.status(403).json({
        success: false,
        message: "Your account is suspended.",
      });
    }

    const incomingHash = hashToken(refreshToken);

    if (
      !user.refreshTokenHash ||
      user.refreshTokenHash !== incomingHash
    ) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid.",
      });
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    user.refreshTokenHash = hashToken(newRefreshToken);

    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    clearRefreshCookie(res);

    return res.status(401).json({
      success: false,
      message: "Refresh token expired or invalid.",
    });
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "ems_refresh_token";

    const refreshToken = req.cookies[cookieName];

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );

        const user = await User.findById(decoded.sub).select(
          "+refreshTokenHash"
        );

        if (user) {
          user.refreshTokenHash = null;
          await user.save();
        }
      } catch {
        // The refresh token may already be expired.
      }
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const currentPasswordMatched =
      await user.comparePassword(currentPassword);

    if (!currentPasswordMatched) {
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
        "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordResetTokenHash +passwordResetExpires");

    const genericMessage =
      "If an account exists for this email, a password reset link has been generated.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const resetToken = generateRandomToken();

    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("\n======================================");
      console.log("PASSWORD RESET URL");
      console.log(resetUrl);
      console.log("======================================\n");
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
      ...(process.env.NODE_ENV !== "production"
        ? { devResetUrl: resetUrl }
        : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or expired.",
      });
    }

    user.password = newPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.refreshTokenHash = null;

    await user.save();

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    next(error);
  }
};