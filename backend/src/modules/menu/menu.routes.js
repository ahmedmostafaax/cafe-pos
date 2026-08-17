import express from "express";
import {
  getAllMenu,
  getPublicMenu,
  createMenu,
  updateMenu,
  toggleMenu,
  setSoldOut,
  deleteMenu,
} from "./menu.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();
router.get("/public", getPublicMenu);
router.get("/", getAllMenu);
router.post("/", protect, restrictTo("admin"), createMenu);
router.patch("/:id", protect, restrictTo("admin", "kitchen", "bar"), updateMenu);
router.patch("/:id/toggle", protect, restrictTo("admin", "kitchen", "bar"), toggleMenu);
router.patch("/:id/sold-out", protect, restrictTo("admin", "kitchen", "bar"), setSoldOut);
router.delete("/:id", protect, restrictTo("admin"), deleteMenu);
export default router;
