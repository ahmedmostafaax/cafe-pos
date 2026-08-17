import Coupon from "../../../database/models/coupon.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const list = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort("-createdAt");
  res.status(200).json({ status: "success", data: { coupons } });
});

export const create = catchAsync(async (req, res) => {
  const c = await Coupon.create(req.body);
  res.status(201).json({ status: "success", data: { coupon: c } });
});

export const remove = catchAsync(async (req, res, next) => {
  const c = await Coupon.findByIdAndDelete(req.params.id);
  if (!c) return next(new AppError("غير موجود", 404));
  res.status(204).json({ status: "success", data: null });
});

export const validateCoupon = catchAsync(async (req, res, next) => {
  const code = (req.body.code || "").trim().toUpperCase();
  const total = Number(req.body.total) || 0;
  const coupon = await Coupon.findOne({
    code,
    isActive: { $ne: false },
    active: { $ne: false },
  });
  // دعم حقول مختلفة
  if (!coupon) {
    const c2 = await Coupon.findOne({ code });
    if (!c2) return next(new AppError("كوبون غير صالح", 400));
  }
  const c = coupon || (await Coupon.findOne({ code }));
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
    return next(new AppError("الكوبون منتهي", 400));
  }
  let discount = 0;
  const type = c.type || c.discountType || "percent";
  const value = c.value ?? c.discount ?? c.amount ?? 0;
  if (type === "percent" || type === "percentage") {
    discount = Math.round((total * Number(value)) / 100);
  } else {
    discount = Number(value);
  }
  if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, total);
  res.status(200).json({
    status: "success",
    data: { code: c.code, discount, finalTotal: Math.max(0, total - discount), message: `خصم ${discount} ج.م` },
  });
});
