import express from "express";
import { list, create, update } from "./inventory.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";
const router = express.Router();
router.use(protect, restrictTo("admin", "kitchen"));
router.get("/", list);
router.post("/", create);
router.patch("/:id", update);
export default router;
