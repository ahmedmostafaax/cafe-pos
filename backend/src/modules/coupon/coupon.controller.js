import Coupon from "../../../database/models/coupon.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort("-createdAt");
  res.status(200).json({ status: "success", data: { coupons } });
});

export const createCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ status: "success", data: { coupon } });
});

export const validateCoupon = catchAsync(async (req, res, next) => {
  const { code, total } = req.body;
  const coupon = await Coupon.findOne({ code: code?.toUpperCase(), isActive: true });
  if (!coupon) return next(new AppError("كوبون غير صالح", 400));
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return next(new AppError("الكوبون منتهي", 400));
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return next(new AppError("تم استخدام الكوبون بالكامل", 400));
  if (total < coupon.minOrder) return next(new AppError(`الحد الأدنى للطلب ${coupon.minOrder} ج.م`, 400));

  const discount =
    coupon.discountPercent > 0
      ? (total * coupon.discountPercent) / 100
      : coupon.discountAmount;

  res.status(200).json({
    status: "success",
    data: { discount, code: coupon.code, couponId: coupon._id },
  });
});

export const deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new AppError("الكوبون غير موجود", 404));
  res.status(204).json({ status: "success", data: null });
});
