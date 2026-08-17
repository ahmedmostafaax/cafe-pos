import express from "express";
import { dailyReport, dailyCsv } from "./reports.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";
const router = express.Router();
router.use(protect, restrictTo("admin"));
router.get("/daily", dailyReport);
router.get("/daily.csv", dailyCsv);
export default router;
