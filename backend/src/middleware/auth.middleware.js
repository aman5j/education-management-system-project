
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const token = authorization.split(" ")[1];

  let decoded;

  // Verify the access token before querying the database.
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired.",
        code: "ACCESS_TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  if (decoded.type !== "access") {
    return res.status(401).json({
      success: false,
      message: "Invalid access token.",
    });
  }

  try {
    // Always load the account and current assigned role from MongoDB.
    // Do not rely on role permissions stored in frontend state or JWT.
    const user = await User.findById(decoded.sub).populate({
      path: "assignedRole",
      select: "name label permissions isActive roleType isSystem",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    // Database or unexpected server errors should reach the error handler,
    // not be incorrectly reported as invalid credentials.
    return next(error);
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    return next();
  };
};
