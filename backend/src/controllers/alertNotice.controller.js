
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import AlertNotice from "../models/AlertNotice.js";
import AlertNoticeDismissal from "../models/AlertNoticeDismissal.js";

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getImagePath = (filename) =>
  filename ? `/uploads/alert-notices/${filename}` : "";

const deleteImageFile = async (imagePath) => {
  if (!imagePath || !imagePath.startsWith("/uploads/alert-notices/")) {
    return;
  }

  const filename = path.basename(imagePath);
  const filePath = path.join(
    process.cwd(),
    "uploads",
    "alert-notices",
    filename
  );

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Alert image cleanup failed:", error);
    }
  }
};

const validateDates = (startAt, endAt) => {
  const start = new Date(startAt);

  if (!startAt || Number.isNaN(start.getTime())) {
    return "Please provide a valid notice start date.";
  }

  if (endAt) {
    const end = new Date(endAt);

    if (Number.isNaN(end.getTime())) {
      return "Please provide a valid notice expiry date.";
    }

    if (end <= start) {
      return "Expiry date must be later than the start date.";
    }
  }

  return null;
};

// ADMIN: GET ALL NOTICES
export const getAdminAlertNotices = async (req, res, next) => {
  try {
    const notices = await AlertNotice.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      success: true,
      data: notices,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: CREATE NOTICE
export const createAlertNotice = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, "Please upload a notice image.");
    }

    const title = String(req.body.title || "").trim();
    const startAt = req.body.startAt || new Date();
    const endAt = req.body.endAt || null;

    if (!title || title.length > 150) {
      await deleteImageFile(getImagePath(req.file.filename));
      return sendError(res, 400, "Notice title is required (maximum 150 characters).");
    }

    const dateError = validateDates(startAt, endAt);

    if (dateError) {
      await deleteImageFile(getImagePath(req.file.filename));
      return sendError(res, 400, dateError);
    }

    const notice = await AlertNotice.create({
      title,
      image: getImagePath(req.file.filename),
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      status: req.body.status === "Inactive" ? "Inactive" : "Active",
      audience: "all",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Alert notice created successfully.",
      data: notice,
    });
  } catch (error) {
    if (req.file) {
      await deleteImageFile(getImagePath(req.file.filename));
    }
    next(error);
  }
};

// ADMIN: UPDATE NOTICE
export const updateAlertNotice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid notice ID.");
    }

    const notice = await AlertNotice.findById(id);

    if (!notice) {
      return sendError(res, 404, "Notice not found.");
    }

    const title = String(req.body.title || "").trim();
    const startAt = req.body.startAt || notice.startAt;
    const endAt = req.body.endAt === ""
      ? null
      : req.body.endAt ?? notice.endAt;

    if (!title || title.length > 150) {
      return sendError(res, 400, "Notice title is required.");
    }

    const dateError = validateDates(startAt, endAt);

    if (dateError) {
      return sendError(res, 400, dateError);
    }

    const oldImage = notice.image;

    notice.title = title;
    notice.startAt = new Date(startAt);
    notice.endAt = endAt ? new Date(endAt) : null;
    notice.status = req.body.status === "Inactive" ? "Inactive" : "Active";
    notice.updatedBy = req.user._id;

    if (req.file) {
      notice.image = getImagePath(req.file.filename);
    }

    await notice.save();

    if (req.file && oldImage !== notice.image) {
      await deleteImageFile(oldImage);
    }

    return res.json({
      success: true,
      message: "Alert notice updated successfully.",
      data: notice,
    });
  } catch (error) {
    if (req.file) {
      await deleteImageFile(getImagePath(req.file.filename));
    }
    next(error);
  }
};

// ADMIN: CHANGE STATUS
export const updateAlertNoticeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid notice ID.");
    }

    const status = req.body.status;

    if (!["Active", "Inactive"].includes(status)) {
      return sendError(res, 400, "Invalid notice status.");
    }

    const notice = await AlertNotice.findByIdAndUpdate(
      id,
      {
        status,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!notice) {
      return sendError(res, 404, "Notice not found.");
    }

    return res.json({
      success: true,
      message: `Notice ${status.toLowerCase()} successfully.`,
      data: notice,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: DELETE NOTICE
export const deleteAlertNotice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid notice ID.");
    }

    const notice = await AlertNotice.findByIdAndDelete(id);

    if (!notice) {
      return sendError(res, 404, "Notice not found.");
    }

    await Promise.all([
      deleteImageFile(notice.image),
      AlertNoticeDismissal.deleteMany({ notice: id }),
    ]);

    return res.json({
      success: true,
      message: "Alert notice deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// STUDENT: GET ACTIVE, NOT-YET-DISMISSED NOTICES
// export const getStudentAlertNotices = async (req, res, next) => {
//   try {
//     const now = new Date();

//     const dismissed = await AlertNoticeDismissal.find({
//       studentUser: req.user._id,
//     }).select("notice").lean();

//     const dismissedIds = dismissed.map((item) => item.notice);

//     const notices = await AlertNotice.find({
//       status: "Active",
//       audience: "all",
//       startAt: { $lte: now },
//       $and: [
//         {
//           $or: [
//             { endAt: null },
//             { endAt: { $gte: now } },
//           ],
//         },
//         {
//           _id: { $nin: dismissedIds },
//         },
//       ],
//     })
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .select("title image startAt endAt createdAt")
//       .lean();

//     return res.json({
//       success: true,
//       data: notices,
//     });
//   } catch (error) {
//     next(error);
//   }
// };


// STUDENT: GET ALL CURRENTLY ACTIVE NOTICES
// Previously dismissed notices must also appear after refresh/login.
export const getStudentAlertNotices = async (req, res, next) => {
  try {
    const now = new Date();

    const notices = await AlertNotice.find({
      status: "Active",
      audience: "all",
      startAt: { $lte: now },
      $or: [
        { endAt: null },
        { endAt: { $gte: now } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title image startAt endAt createdAt")
      .lean();

    return res.json({
      success: true,
      data: notices,
    });
  } catch (error) {
    next(error);
  }
};


// STUDENT: DISMISS NOTICE
export const dismissStudentAlertNotice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid notice ID.");
    }

    const notice = await AlertNotice.findOne({
      _id: id,
      status: "Active",
    }).select("_id");

    if (!notice) {
      return sendError(res, 404, "Notice not found or inactive.");
    }

    await AlertNoticeDismissal.updateOne(
      {
        notice: id,
        studentUser: req.user._id,
      },
      {
        $setOnInsert: {
          notice: id,
          studentUser: req.user._id,
          dismissedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.json({
      success: true,
      message: "Notice dismissed.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: "Notice already dismissed.",
      });
    }

    next(error);
  }
};
