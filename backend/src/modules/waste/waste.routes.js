import express from "express";
import { createWaste, getWaste, wasteSummary } from "./waste.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";
const router = express.Router();
router.use(protect);
router.get("/", getWaste);
router.get("/summary", wasteSummary);
router.post("/", restrictTo("admin", "kitchen", "bar"), createWaste);
export default router;
