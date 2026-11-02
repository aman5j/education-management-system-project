
import express from "express";

import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

import {
  createStudentTicket,
  getMySupportTickets,
  getMySupportStats,
  getMySupportTicket,
  getMySupportMessages,
  addStudentSupportMessage,
  reopenMySupportTicket,
  getAdminSupportStats,
  getAllSupportTickets,
  getAdminSupportTicket,
  getAdminSupportMessages,
  addAdminSupportMessage,
  updateAdminTicketStatus,
  updateAdminTicketPriority,
} from "../controllers/support.controller.js";

const router = express.Router();

router.use(authenticate);

// Student self-service routes.
// Student ownership is always checked against req.user.studentRecord.
router.post(
  "/tickets",
  authorizeRoles("student"),
  createStudentTicket
);

router.get(
  "/tickets/my/stats",
  authorizeRoles("student"),
  getMySupportStats
);

router.get(
  "/tickets/my",
  authorizeRoles("student"),
  getMySupportTickets
);

router.get(
  "/tickets/:id/messages",
  authorizeRoles("student"),
  getMySupportMessages
);

router.post(
  "/tickets/:id/messages",
  authorizeRoles("student"),
  addStudentSupportMessage
);

router.patch(
  "/tickets/:id/reopen",
  authorizeRoles("student"),
  reopenMySupportTicket
);

router.get(
  "/tickets/:id",
  authorizeRoles("student"),
  getMySupportTicket
);

// Admin-only management routes.
// There are intentionally no Staff assignment or Staff queue routes.
router.get(
  "/admin/stats",
  authorizeRoles("admin"),
  getAdminSupportStats
);

router.get(
  "/admin/tickets",
  authorizeRoles("admin"),
  getAllSupportTickets
);

router.get(
  "/admin/tickets/:id/messages",
  authorizeRoles("admin"),
  getAdminSupportMessages
);

router.post(
  "/admin/tickets/:id/messages",
  authorizeRoles("admin"),
  addAdminSupportMessage
);

router.patch(
  "/admin/tickets/:id/status",
  authorizeRoles("admin"),
  updateAdminTicketStatus
);

router.patch(
  "/admin/tickets/:id/priority",
  authorizeRoles("admin"),
  updateAdminTicketPriority
);

router.get(
  "/admin/tickets/:id",
  authorizeRoles("admin"),
  getAdminSupportTicket
);

export default router;
