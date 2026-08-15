import User from "../../../database/models/user.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";

export const getAllUsers = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(User.find().select("-password"), req.query)
    .filter()
    .search(["name", "username"])
    .sort()
    .paginate();

  const users = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const createUser = catchAsync(async (req, res, next) => {
  const user = await User.create(req.body);
  user.password = undefined;

  res.status(201).json({
    status: "success",
    data: { user },
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  // منع تغيير الباسورد من هنا
  if (req.body.password) delete req.body.password;

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  res.status(204).json({ status: "success", data: null });
});

export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    status: "success",
    data: { user },
  });
});
