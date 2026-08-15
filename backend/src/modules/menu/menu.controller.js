import Menu from "../../../database/models/menu.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";

export const getAllMenu = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(
    Menu.find().populate("category", "name nameAr nameEn"),
    req.query
  )
    .filter()
    .search(["name", "nameAr", "nameEn", "desc"])
    .sort()
    .paginate();

  const menu = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: menu.length,
    data: { menu },
  });
});

export const getMenuItem = catchAsync(async (req, res, next) => {
  const item = await Menu.findById(req.params.id).populate(
    "category",
    "name nameAr nameEn"
  );

  if (!item) {
    return next(new AppError("المنتج غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: { item },
  });
});

export const createMenuItem = catchAsync(async (req, res, next) => {
  const item = await Menu.create(req.body);

  res.status(201).json({
    status: "success",
    data: { item },
  });
});

export const updateMenuItem = catchAsync(async (req, res, next) => {
  const item = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("category", "name nameAr nameEn");

  if (!item) {
    return next(new AppError("المنتج غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: { item },
  });
});

export const deleteMenuItem = catchAsync(async (req, res, next) => {
  const item = await Menu.findByIdAndDelete(req.params.id);

  if (!item) {
    return next(new AppError("المنتج غير موجود", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const toggleAvailability = catchAsync(async (req, res, next) => {
  const item = await Menu.findById(req.params.id);

  if (!item) {
    return next(new AppError("المنتج غير موجود", 404));
  }

  item.available = !item.available;
  await item.save();

  res.status(200).json({
    status: "success",
    data: { item },
  });
});
