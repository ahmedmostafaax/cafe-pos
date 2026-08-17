import express from "express";
import { getPublicSettings, getSettings, updateSettings } from "./settings.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();
router.get("/public", getPublicSettings);
router.get("/", protect, restrictTo("admin"), getSettings);
router.patch("/", protect, restrictTo("admin"), updateSettings);
export default router;
