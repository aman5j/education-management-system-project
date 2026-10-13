
import express from "express";
import { verifyHallTicket } from "../controllers/publicHallTicket.controller.js";

const router = express.Router();

router.get("/:id", verifyHallTicket);

export default router;
