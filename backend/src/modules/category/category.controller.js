import Category from "../../../database/models/category.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";

export const getAllCategories = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(Category.find(), req.query)
    .filter()
    .search(["name", "nameAr", "nameEn"])
    .sort()
    .paginate();

  const categories = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: { categories },
  });
});

export const getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(new AppError("التصنيف غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
});

export const createCategory = catchAsync(async (req, res, next) => {
  const category = await Category.create(req.body);

  res.status(201).json({
    status: "success",
    data: { category },
  });
});

export const updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return next(new AppError("التصنيف غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
});

export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    return next(new AppError("التصنيف غير موجود", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
