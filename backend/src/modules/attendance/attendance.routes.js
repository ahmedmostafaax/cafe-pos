import express from "express";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getOnShift,
} from "./attendance.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get("/me", getMyAttendance);
router.get("/today", restrictTo("admin"), getTodayAttendance);
router.get("/on-shift", restrictTo("admin"), getOnShift);

export default router;
