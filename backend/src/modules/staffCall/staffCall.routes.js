import express from "express";
import { createCall, getPending, ackCall, doneCall } from "./staffCall.controller.js";
import { protect } from "../../middleware/auth.js";

const router = express.Router();
router.post("/", createCall);
router.get("/pending", protect, getPending);
router.patch("/:id/ack", protect, ackCall);
router.patch("/:id/done", protect, doneCall);
export default router;
