import Combo from "../../../database/models/combo.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const listPublic = catchAsync(async (req, res) => {
  const combos = await Combo.find({ active: true }).populate("itemIds", "name nameAr price");
  res.status(200).json({ status: "success", data: { combos } });
});

export const list = catchAsync(async (req, res) => {
  const combos = await Combo.find().populate("itemIds", "name nameAr price").sort("-createdAt");
  res.status(200).json({ status: "success", data: { combos } });
});

export const create = catchAsync(async (req, res) => {
  const combo = await Combo.create(req.body);
  res.status(201).json({ status: "success", data: { combo } });
});

export const update = catchAsync(async (req, res, next) => {
  const combo = await Combo.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!combo) return next(new AppError("غير موجود", 404));
  res.status(200).json({ status: "success", data: { combo } });
});

export const remove = catchAsync(async (req, res, next) => {
  const combo = await Combo.findByIdAndDelete(req.params.id);
  if (!combo) return next(new AppError("غير موجود", 404));
  res.status(204).json({ status: "success", data: null });
});
