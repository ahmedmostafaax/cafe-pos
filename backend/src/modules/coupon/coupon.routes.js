import express from "express";
import { getAllCoupons, createCoupon, validateCoupon, deleteCoupon } from "./coupon.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();
router.post("/validate", validateCoupon);
router.get("/", protect, restrictTo("admin"), getAllCoupons);
router.post("/", protect, restrictTo("admin"), createCoupon);
router.delete("/:id", protect, restrictTo("admin"), deleteCoupon);
export default router;
