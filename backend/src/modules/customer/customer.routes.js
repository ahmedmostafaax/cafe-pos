import express from "express";
import rateLimit from "express-rate-limit";
import { getCaptcha, register, login, getMe } from "./customer.controller.js";
import jwt from "jsonwebtoken";
import Customer from "../../../database/models/customer.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";

const router = express.Router();

const customerAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: "fail", message: "محاولات كثيرة، استنى شوية" },
});

const protectCustomer = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return next(new AppError("يجب تسجيل الدخول أولاً", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== "customer") return next(new AppError("غير مصرح", 401));

  const customer = await Customer.findById(decoded.id);
  if (!customer) return next(new AppError("الحساب غير موجود", 401));
  if (customer.isLocked()) return next(new AppError("الحساب مقفول مؤقتاً", 423));

  req.customer = customer;
  next();
});

router.get("/captcha", getCaptcha);
router.post("/register", customerAuthLimiter, register);
router.post("/login", customerAuthLimiter, login);
router.get("/me", protectCustomer, getMe);

export default router;
export { protectCustomer };
