import Favorite from "../../../database/models/favorite.model.js";
import catchAsync from "../../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import Customer from "../../../database/models/customer.model.js";
import AppError from "../../utils/AppError.js";

export const protectCustomer = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer")
    ? req.headers.authorization.split(" ")[1]
    : null;
  if (!token) return next(new AppError("يجب تسجيل الدخول", 401));
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== "customer") return next(new AppError("غير مصرح", 401));
  const customer = await Customer.findById(decoded.id);
  if (!customer) return next(new AppError("غير موجود", 401));
  req.customer = customer;
  next();
});

export const list = catchAsync(async (req, res) => {
  const favs = await Favorite.find({ customer: req.customer._id }).populate("menuItem");
  res.status(200).json({
    status: "success",
    data: { items: favs.map((f) => f.menuItem).filter(Boolean) },
  });
});

export const toggle = catchAsync(async (req, res) => {
  const menuItem = req.body.menuId || req.params.menuId;
  const existing = await Favorite.findOne({ customer: req.customer._id, menuItem });
  if (existing) {
    await existing.deleteOne();
    return res.status(200).json({ status: "success", data: { favorited: false } });
  }
  await Favorite.create({ customer: req.customer._id, menuItem });
  res.status(200).json({ status: "success", data: { favorited: true } });
});
