import express from "express";
import {
  getHallTickets,
  getEligibleHallTicketStudents,
  generateHallTickets,
  cancelHallTicket,
  rescheduleMissedHallTicket,
} from "../controllers/hallTicket.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getHallTickets);
router.get("/eligible-students", getEligibleHallTicketStudents);
router.post("/generate", generateHallTickets);
router.patch("/:id/cancel", cancelHallTicket);
router.patch(
  "/:id/reschedule-missed",
  rescheduleMissedHallTicket
);

export default router;