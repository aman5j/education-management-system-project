
import mongoose from "mongoose";
import Course from "../models/Course.js";
import CourseEnquiry from "../models/CourseEnquiry.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// PUBLIC: SUBMIT ENQUIRY
export const createCourseEnquiry = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone = "",
      preparingFor = "",
      message,
    } = req.body || {};

    const cleanName = String(fullName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();
    const cleanPreparingFor = String(preparingFor || "").trim();
    const cleanMessage = String(message || "").trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return fail(res, 400, "Enter a valid full name.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(cleanEmail) ||
      cleanEmail.length > 254
    ) {
      return fail(res, 400, "Enter a valid email address.");
    }

    if (
      cleanPhone &&
      !/^[0-9+\-\s()]{7,20}$/.test(cleanPhone)
    ) {
      return fail(res, 400, "Enter a valid phone number.");
    }

    if (cleanPreparingFor.length > 150) {
      return fail(res, 400, "Preparing for value is too long.");
    }

    if (
      cleanMessage.length < 5 ||
      cleanMessage.length > 2000
    ) {
      return fail(
        res,
        400,
        "Message must contain between 5 and 2000 characters."
      );
    }

    let course = null;
    let enquiryType = "General";
    let courseTitle = "";

    if (cleanPreparingFor && cleanPreparingFor !== "General Enquiry") {
      if (!mongoose.Types.ObjectId.isValid(cleanPreparingFor)) {
        return fail(res, 400, "Invalid course selection.");
      }

      course = await Course.findOne({
        _id: cleanPreparingFor,
        status: "Published",
      }).select("_id courseTitle");

      if (!course) {
        return fail(
          res,
          400,
          "The selected course is no longer available."
        );
      }

      enquiryType = "Course";
      courseTitle = course.courseTitle;
    }

    const enquiry = await CourseEnquiry.create({
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      preparingFor:
        cleanPreparingFor === "General Enquiry"
          ? "General Enquiry"
          : courseTitle,
      enquiryType,
      course: course?._id || null,
      courseTitle,
      message: cleanMessage,
    });

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
      data: {
        enquiryId: enquiry._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: LIST ENQUIRIES
export const getCourseEnquiries = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();

    const filter = {};

    if (["New", "Contacted", "Closed"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { courseTitle: regex },
        { message: regex },
      ];
    }

    const [enquiries, total] = await Promise.all([
      CourseEnquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      CourseEnquiry.countDocuments(filter),
    ]);

    const statusCounts = await CourseEnquiry.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      New: 0,
      Contacted: 0,
      Closed: 0,
    };

    statusCounts.forEach((item) => {
      counts[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        enquiries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: GET SINGLE ENQUIRY
export const getCourseEnquiryById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 400, "Invalid enquiry ID.");
    }

    const enquiry = await CourseEnquiry.findById(
      req.params.id
    ).lean();

    if (!enquiry) {
      return fail(res, 404, "Enquiry not found.");
    }

    return res.status(200).json({
      success: true,
      data: { enquiry },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: UPDATE STATUS
export const updateCourseEnquiryStatus = async (
  req,
  res,
  next
) => {
  try {
    const { status } = req.body || {};

    if (!["New", "Contacted", "Closed"].includes(status)) {
      return fail(res, 400, "Invalid enquiry status.");
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 400, "Invalid enquiry ID.");
    }

    const enquiry = await CourseEnquiry.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!enquiry) {
      return fail(res, 404, "Enquiry not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry status updated successfully.",
      data: { enquiry },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: PERMANENT DELETE
export const deleteCourseEnquiry = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 400, "Invalid enquiry ID.");
    }

    const enquiry = await CourseEnquiry.findByIdAndDelete(
      req.params.id
    );

    if (!enquiry) {
      return fail(res, 404, "Enquiry not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry permanently deleted.",
    });
  } catch (error) {
    next(error);
  }
};
