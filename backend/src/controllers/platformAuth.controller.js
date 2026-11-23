
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { getPlatformConnection } from "../config/platformDb.js";
import getPlatformUserModel from "../models/PlatformUser.js";

const PLATFORM_ISSUER = "ems-platform";
const PLATFORM_AUDIENCE = "ems-platform-admin";

const getCookieName = () =>
  process.env.PLATFORM_COOKIE_NAME ||
  "ems_platform_refresh_token";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/platform/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const setRefreshCookie = (res, token) => {
  res.cookie(getCookieName(), token, getCookieOptions());
};

const clearRefreshCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(getCookieName(), {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/platform/auth",
  });
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const safeHashMatch = (storedHash, incomingToken) => {
  if (!storedHash || !incomingToken) return false;

  const incomingHash = hashToken(incomingToken);

  const stored = Buffer.from(storedHash, "hex");
  const incoming = Buffer.from(incomingHash, "hex");

  return (
    stored.length === incoming.length &&
    crypto.timingSafeEqual(stored, incoming)
  );
};

const getSecrets = () => {
  const accessSecret = process.env.PLATFORM_JWT_ACCESS_SECRET;
  const refreshSecret = process.env.PLATFORM_JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error(
      "Platform JWT secrets are not configured."
    );
  }

  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error(
      "Platform JWT secrets must each contain at least 32 characters."
    );
  }

  if (accessSecret === refreshSecret) {
    throw new Error(
      "Platform access and refresh secrets must be different."
    );
  }

  return { accessSecret, refreshSecret };
};

const createAccessToken = (user) => {
  const { accessSecret } = getSecrets();

  return jwt.sign(
    { type: "access" },
    accessSecret,
    {
      subject: String(user._id),
      issuer: PLATFORM_ISSUER,
      audience: PLATFORM_AUDIENCE,
      expiresIn: process.env.PLATFORM_JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
};

const createRefreshToken = (user, expiresIn) => {
  const { refreshSecret } = getSecrets();

  return jwt.sign(
    { type: "refresh" },
    refreshSecret,
    {
      subject: String(user._id),
      issuer: PLATFORM_ISSUER,
      audience: PLATFORM_AUDIENCE,
      expiresIn:
        expiresIn ||
        process.env.PLATFORM_JWT_REFRESH_EXPIRES_IN ||
        "7d",
    }
  );
};

const getPlatformUserModelInstance = () => {
  const connection = getPlatformConnection();
  return getPlatformUserModel(connection);
};

export const platformLogin = async (req, res, next) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const PlatformUser = getPlatformUserModelInstance();

    const user = await PlatformUser.findOne({ email })
      .select("+password +refreshTokenHash");

    if (!user || user.role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your platform account is suspended.",
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
      message: "Platform login successful.",
      data: {
        accessToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const platformRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[getCookieName()];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Platform refresh token not found.",
      });
    }

    const { refreshSecret } = getSecrets();

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, refreshSecret, {
        issuer: PLATFORM_ISSUER,
        audience: PLATFORM_AUDIENCE,
      });
    } catch {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Platform session expired or invalid.",
      });
    }

    if (decoded.type !== "refresh") {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Invalid platform refresh token.",
      });
    }

    const PlatformUser = getPlatformUserModelInstance();

    const user = await PlatformUser.findById(decoded.sub)
      .select("+refreshTokenHash");

    if (!user || user.status !== "active") {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Platform account is unavailable.",
      });
    }

    if (!safeHashMatch(user.refreshTokenHash, refreshToken)) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Platform session is no longer valid.",
      });
    }

    const remainingSeconds =
      decoded.exp - Math.floor(Date.now() / 1000);

    if (remainingSeconds <= 0) {
      clearRefreshCookie(res);

      return res.status(401).json({
        success: false,
        message: "Platform session expired. Please log in again.",
      });
    }

    const accessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(
      user,
      `${remainingSeconds}s`
    );

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const platformLogout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[getCookieName()];

    if (refreshToken) {
      try {
        const { refreshSecret } = getSecrets();

        const decoded = jwt.verify(refreshToken, refreshSecret, {
          issuer: PLATFORM_ISSUER,
          audience: PLATFORM_AUDIENCE,
        });

        const PlatformUser = getPlatformUserModelInstance();

        const user = await PlatformUser.findById(decoded.sub)
          .select("+refreshTokenHash");

        if (user && safeHashMatch(user.refreshTokenHash, refreshToken)) {
          user.refreshTokenHash = null;
          await user.save();
        }
      } catch {
        // Clear the cookie even if the token has already expired.
      }
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Platform logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

export const platformMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.platformUser.toSafeObject(),
    },
  });
};
