import express from "express";
import {
  getHallTickets,
  generateHallTickets,
  cancelHallTicket,
} from "../controllers/hallTicket.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getHallTickets);
router.post("/generate", generateHallTickets);
router.patch("/:id/cancel", cancelHallTicket);

export default router;