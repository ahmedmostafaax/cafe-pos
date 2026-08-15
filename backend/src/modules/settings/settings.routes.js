import express from "express";
import {
  getSetting,
  setSetting,
  getAllSettings,
} from "./settings.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getAllSettings);
router.get("/:key", protect, getSetting);
router.put("/:key", protect, restrictTo("admin"), setSetting);

export default router;
