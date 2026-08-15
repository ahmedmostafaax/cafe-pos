import Offer from "../../../database/models/offer.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const getAllOffers = catchAsync(async (req, res) => {
  const filter = req.query.all === "true" ? {} : { isActive: true };
  const offers = await Offer.find(filter).sort("sort -createdAt");
  res.status(200).json({ status: "success", data: { offers } });
});

export const createOffer = catchAsync(async (req, res) => {
  const offer = await Offer.create(req.body);
  res.status(201).json({ status: "success", data: { offer } });
});

export const updateOffer = catchAsync(async (req, res, next) => {
  const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!offer) return next(new AppError("العرض غير موجود", 404));
  res.status(200).json({ status: "success", data: { offer } });
});

export const deleteOffer = catchAsync(async (req, res, next) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) return next(new AppError("العرض غير موجود", 404));
  res.status(204).json({ status: "success", data: null });
});
