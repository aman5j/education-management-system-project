
import mongoose from "mongoose";

import Student from "../models/Student.js";
import SupportTicket, {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
} from "../models/SupportTicket.js";
import SupportMessage from "../models/SupportMessage.js";
import SupportCounter from "../models/SupportCounter.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const populateTicket = (query) =>
  query.populate(
    "student_id",
    "firstName surname rollNo mobile email profileImage"
  );

const getStudent = async (req) => {
  if (req.user?.role !== "student" || !req.user.studentRecord) {
    return null;
  }

  return Student.findById(req.user.studentRecord)
    .select("_id firstName surname rollNo mobile email status")
    .lean();
};

const generateTicketNumber = async () => {
  // Atomic counter update prevents duplicate ticket numbers.
  try {
    const counter = await SupportCounter.findOneAndUpdate(
      { name: "support_ticket" },
      { $inc: { sequence: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return `TICKET-${String(counter.sequence).padStart(6, "0")}`;
  } catch (error) {
    // If two first-time requests race while creating the counter,
    // retry after the unique index has been established.
    if (error.code !== 11000) throw error;

    const counter = await SupportCounter.findOneAndUpdate(
      { name: "support_ticket" },
      { $inc: { sequence: 1 } },
      { new: true }
    );

    return `TICKET-${String(counter.sequence).padStart(6, "0")}`;
  }
};

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getTicketForStudent = async (ticketId, studentId) => {
  if (!validId(ticketId)) return null;

  return SupportTicket.findOne({
    _id: ticketId,
    student_id: studentId,
  });
};

const updateLastMessage = async (ticketId) => {
  await SupportTicket.updateOne(
    { _id: ticketId },
    { $set: { lastMessageAt: new Date() } }
  );
};

/*
|--------------------------------------------------------------------------
| STUDENT APIs
|--------------------------------------------------------------------------
*/

/**
 * POST /api/support/tickets
 * Create a ticket for the authenticated student.
 */
export const createStudentTicket = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    if (student.status !== "active") {
      return fail(res, 403, "Inactive students cannot create support tickets.");
    }

    const {
      title,
      description,
      mobile,
      category,
      priority = "Medium",
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      return fail(res, 400, "Issue title is required (maximum 150 characters).");
    }

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 3000
    ) {
      return fail(
        res,
        400,
        "Description is required (maximum 3000 characters)."
      );
    }

    if (!SUPPORT_CATEGORIES.includes(category)) {
      return fail(res, 400, "Please select a valid support category.");
    }

    if (!SUPPORT_PRIORITIES.includes(priority)) {
      return fail(res, 400, "Please select a valid priority.");
    }

    const contactNumber =
      typeof mobile === "string" && mobile.trim()
        ? mobile.trim()
        : student.mobile || "";

    if (contactNumber.length > 20) {
      return fail(res, 400, "Mobile number cannot exceed 20 characters.");
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await SupportTicket.create({
      ticketNumber,
      student_id: student._id,
      title: title.trim(),
      description: description.trim(),
      mobile: contactNumber,
      category,
      priority,
      status: "Open",
      lastMessageAt: new Date(),
    });

    const populated = await populateTicket(
      SupportTicket.findById(ticket._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/tickets/my
 */
export const getMySupportTickets = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { student_id: student._id };

    if (req.query.status) {
      if (!SUPPORT_STATUSES.includes(req.query.status)) {
        return fail(res, 400, "Invalid ticket status.");
      }
      filter.status = req.query.status;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/tickets/my/stats
 */
export const getMySupportStats = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const grouped = await SupportTicket.aggregate([
      { $match: { student_id: student._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      Open: 0,
      "In Progress": 0,
      Resolved: 0,
      Closed: 0,
    };

    grouped.forEach((item) => {
      stats[item._id] = item.count;
      stats.total += item.count;
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/tickets/:id
 * Student can only open their own ticket.
 */
export const getMySupportTicket = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const ticket = await populateTicket(
      SupportTicket.findOne({
        _id: req.params.id,
        student_id: student._id,
      })
    ).lean();

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/tickets/:id/messages
 */
export const getMySupportMessages = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const ticket = await getTicketForStudent(
      req.params.id,
      student._id
    );

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    const messages = await SupportMessage.find({
      ticket_id: ticket._id,
      isInternal: false,
    })
      .populate("sender_id", "name role avatar")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/support/tickets/:id/messages
 * Student replies to their own ticket.
 */
export const addStudentSupportMessage = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const ticket = await getTicketForStudent(
      req.params.id,
      student._id
    );

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    if (["Resolved", "Closed"].includes(ticket.status)) {
      return fail(
        res,
        409,
        "This ticket is not open for replies. Reopen it before sending a message."
      );
    }

    const messageText =
      typeof req.body.message === "string"
        ? req.body.message.trim()
        : "";

    if (!messageText || messageText.length > 3000) {
      return fail(res, 400, "Message is required (maximum 3000 characters).");
    }

    const message = await SupportMessage.create({
      ticket_id: ticket._id,
      sender_id: req.user._id,
      sender_role: "student",
      message: messageText,
      isInternal: false,
    });

    await updateLastMessage(ticket._id);

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/support/tickets/:id/reopen
 */
export const reopenMySupportTicket = async (req, res, next) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return fail(res, 409, "Your student account is not linked correctly.");
    }

    const ticket = await getTicketForStudent(
      req.params.id,
      student._id
    );

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    if (!["Resolved", "Closed"].includes(ticket.status)) {
      return fail(res, 409, "Only resolved or closed tickets can be reopened.");
    }

    ticket.status = "Open";
    ticket.resolvedAt = null;
    ticket.closedAt = null;
    ticket.reopenedAt = new Date();
    ticket.lastMessageAt = new Date();

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket reopened successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN APIs — ADMIN ONLY, NO STAFF ASSIGNMENT
|--------------------------------------------------------------------------
*/

/**
 * GET /api/support/admin/stats
 */
export const getAdminSupportStats = async (req, res, next) => {
  try {
    const grouped = await SupportTicket.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      Open: 0,
      "In Progress": 0,
      Resolved: 0,
      Closed: 0,
    };

    grouped.forEach((item) => {
      stats[item._id] = item.count;
      stats.total += item.count;
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/admin/tickets
 * Filters: status, priority, category, search, page, limit.
 */
export const getAllSupportTickets = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.status) {
      if (!SUPPORT_STATUSES.includes(req.query.status)) {
        return fail(res, 400, "Invalid ticket status.");
      }
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      if (!SUPPORT_PRIORITIES.includes(req.query.priority)) {
        return fail(res, 400, "Invalid ticket priority.");
      }
      filter.priority = req.query.priority;
    }

    if (req.query.category) {
      if (!SUPPORT_CATEGORIES.includes(req.query.category)) {
        return fail(res, 400, "Invalid ticket category.");
      }
      filter.category = req.query.category;
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = escapeRegex(req.query.search.trim());
      const matchingStudents = await Student.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { surname: { $regex: search, $options: "i" } },
          { rollNo: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();

      filter.$or = [
        { ticketNumber: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { student_id: { $in: matchingStudents.map((item) => item._id) } },
      ];
    }

    const [tickets, total] = await Promise.all([
      populateTicket(
        SupportTicket.find(filter)
      )
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/admin/tickets/:id
 */
export const getAdminSupportTicket = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const ticket = await populateTicket(
      SupportTicket.findById(req.params.id)
    ).lean();

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/admin/tickets/:id/messages
 */
export const getAdminSupportMessages = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const exists = await SupportTicket.exists({ _id: req.params.id });

    if (!exists) {
      return fail(res, 404, "Support ticket not found.");
    }

    const messages = await SupportMessage.find({
      ticket_id: req.params.id,
    })
      .populate("sender_id", "name role avatar")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/support/admin/tickets/:id/messages
 */
export const addAdminSupportMessage = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    if (["Resolved", "Closed"].includes(ticket.status)) {
      return fail(
        res,
        409,
        "Reopen this ticket before sending a reply."
      );
    }

    const messageText =
      typeof req.body.message === "string"
        ? req.body.message.trim()
        : "";

    if (!messageText || messageText.length > 3000) {
      return fail(res, 400, "Message is required (maximum 3000 characters).");
    }

    const message = await SupportMessage.create({
      ticket_id: ticket._id,
      sender_id: req.user._id,
      sender_role: "admin",
      message: messageText,
      isInternal: false,
    });

    await updateLastMessage(ticket._id);

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/support/admin/tickets/:id/status
 */
export const updateAdminTicketStatus = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const { status } = req.body;

    if (!SUPPORT_STATUSES.includes(status)) {
      return fail(res, 400, "Please provide a valid ticket status.");
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    const allowedTransitions = {
      Open: ["In Progress", "Resolved", "Closed"],
      "In Progress": ["Open", "Resolved", "Closed"],
      Resolved: ["Open", "Closed"],
      Closed: ["Open"],
    };

    if (
      ticket.status !== status &&
      !allowedTransitions[ticket.status]?.includes(status)
    ) {
      return fail(
        res,
        409,
        `Cannot change ticket status from ${ticket.status} to ${status}.`
      );
    }

    if (ticket.status !== status) {
      ticket.status = status;

      if (status === "Resolved") {
        ticket.resolvedAt = new Date();
        ticket.closedAt = null;
      } else if (status === "Closed") {
        ticket.closedAt = new Date();
      } else if (status === "Open") {
        ticket.reopenedAt = new Date();
        ticket.resolvedAt = null;
        ticket.closedAt = null;
      } else {
        ticket.resolvedAt = null;
        ticket.closedAt = null;
      }

      ticket.lastMessageAt = new Date();
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/support/admin/tickets/:id/priority
 */
export const updateAdminTicketPriority = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid ticket ID.");
    }

    const { priority } = req.body;

    if (!SUPPORT_PRIORITIES.includes(priority)) {
      return fail(res, 400, "Please provide a valid ticket priority.");
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { $set: { priority } },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return fail(res, 404, "Support ticket not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Ticket priority updated successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};
