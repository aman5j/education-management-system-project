
import jwt from "jsonwebtoken";

import { getPlatformConnection } from "../config/platformDb.js";
import getPlatformUserModel from "../models/PlatformUser.js";

export const authenticatePlatform = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Platform authentication required.",
    });
  }

  const token = authorization.split(" ")[1];

  let decoded;

  try {
    const secret = process.env.PLATFORM_JWT_ACCESS_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error("Platform access secret is not configured.");
    }

    decoded = jwt.verify(token, secret, {
      issuer: "ems-platform",
      audience: "ems-platform-admin",
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired platform access token.",
    });
  }

  if (decoded.type !== "access") {
    return res.status(401).json({
      success: false,
      message: "Invalid platform access token.",
    });
  }

  try {
    const connection = getPlatformConnection();
    const PlatformUser = getPlatformUserModel(connection);

    const user = await PlatformUser.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Platform account not found.",
      });
    }

    if (user.role !== "super_admin" || user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Platform access is not permitted.",
      });
    }

    req.platformUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorizePlatformRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.platformUser) {
      return res.status(401).json({
        success: false,
        message: "Platform authentication required.",
      });
    }

    if (!roles.includes(req.platformUser.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this platform action.",
      });
    }

    return next();
  };
};
