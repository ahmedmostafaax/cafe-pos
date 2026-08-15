import Table from "../../../database/models/table.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";

export const getAllTables = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(Table.find(), req.query)
    .filter()
    .search(["tableNo"])
    .sort()
    .paginate();

  const tables = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: tables.length,
    data: { tables },
  });
});

export const getTable = catchAsync(async (req, res, next) => {
  const table = await Table.findById(req.params.id);
  if (!table) return next(new AppError("الطاولة غير موجودة", 404));

  res.status(200).json({
    status: "success",
    data: { table },
  });
});

export const createTable = catchAsync(async (req, res, next) => {
  const table = await Table.create(req.body);
  res.status(201).json({
    status: "success",
    data: { table },
  });
});

export const updateTable = catchAsync(async (req, res, next) => {
  const table = await Table.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!table) return next(new AppError("الطاولة غير موجودة", 404));

  res.status(200).json({
    status: "success",
    data: { table },
  });
});

export const deleteTable = catchAsync(async (req, res, next) => {
  const table = await Table.findByIdAndDelete(req.params.id);
  if (!table) return next(new AppError("الطاولة غير موجودة", 404));

  res.status(204).json({ status: "success", data: null });
});
