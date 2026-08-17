import express from "express";
import { list, create, remove, validateCoupon } from "./coupon.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";
const router = express.Router();
router.post("/validate", validateCoupon);
router.get("/", protect, restrictTo("admin"), list);
router.post("/", protect, restrictTo("admin"), create);
router.delete("/:id", protect, restrictTo("admin"), remove);
export default router;
