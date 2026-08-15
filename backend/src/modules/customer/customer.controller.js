import jwt from "jsonwebtoken";
import Customer from "../../../database/models/customer.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

const signToken = (id) =>
  jwt.sign({ id, type: "customer" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const MAX_ATTEMPTS = 3;
const LOCK_MS = 15 * 60 * 1000; // 15 دقيقة

// كابتشا بسيطة في الذاكرة (للديمو)
const captchaStore = new Map();

export const getCaptcha = catchAsync(async (req, res) => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  captchaStore.set(id, { answer: a + b, exp: Date.now() + 5 * 60 * 1000 });
  // تنظيف قديم
  for (const [k, v] of captchaStore) {
    if (v.exp < Date.now()) captchaStore.delete(k);
  }
  res.status(200).json({
    status: "success",
    data: { captchaId: id, question: `${a} + ${b} = ?` },
  });
});

function checkCaptcha(captchaId, captchaAnswer) {
  const row = captchaStore.get(captchaId);
  if (!row || row.exp < Date.now()) return false;
  captchaStore.delete(captchaId);
  return Number(captchaAnswer) === row.answer;
}

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, phone, captchaId, captchaAnswer } = req.body;

  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError("كل الحقول مطلوبة", 400));
  }
  if (password !== passwordConfirm) {
    return next(new AppError("كلمة المرور غير متطابقة", 400));
  }
  if (password.length < 6) {
    return next(new AppError("كلمة المرور 6 أحرف على الأقل", 400));
  }
  if (!checkCaptcha(captchaId, captchaAnswer)) {
    return next(new AppError("الكابتشا غير صحيحة", 400));
  }

  const exists = await Customer.findOne({ email: email.toLowerCase() });
  if (exists) return next(new AppError("الإيميل مستخدم بالفعل", 400));

  const customer = await Customer.create({
    name,
    email,
    password,
    phone: phone || "",
  });

  const token = signToken(customer._id);
  res.status(201).json({
    status: "success",
    token,
    data: {
      customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone },
    },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password, captchaId, captchaAnswer } = req.body;

  if (!email || !password) {
    return next(new AppError("الإيميل وكلمة المرور مطلوبان", 400));
  }
  if (!checkCaptcha(captchaId, captchaAnswer)) {
    return next(new AppError("الكابتشا غير صحيحة", 400));
  }

  const customer = await Customer.findOne({ email: email.toLowerCase() }).select("+password");
  if (!customer) {
    return next(new AppError("بيانات الدخول غير صحيحة", 401));
  }

  if (customer.isLocked()) {
    return next(new AppError("الحساب مقفول مؤقتاً. حاول بعد 15 دقيقة", 423));
  }

  const ok = await customer.correctPassword(password, customer.password);
  if (!ok) {
    customer.loginAttempts += 1;
    if (customer.loginAttempts >= MAX_ATTEMPTS) {
      customer.lockUntil = new Date(Date.now() + LOCK_MS);
      customer.loginAttempts = 0;
      await customer.save({ validateBeforeSave: false });
      return next(new AppError("تم تجاوز 3 محاولات. الحساب مقفول 15 دقيقة", 423));
    }
    await customer.save({ validateBeforeSave: false });
    const left = MAX_ATTEMPTS - customer.loginAttempts;
    return next(new AppError(`بيانات غير صحيحة. متبقي ${left} محاولة`, 401));
  }

  customer.loginAttempts = 0;
  customer.lockUntil = undefined;
  await customer.save({ validateBeforeSave: false });

  const token = signToken(customer._id);
  res.status(200).json({
    status: "success",
    token,
    data: {
      customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone },
    },
  });
});

export const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    status: "success",
    data: { customer: req.customer },
  });
});
