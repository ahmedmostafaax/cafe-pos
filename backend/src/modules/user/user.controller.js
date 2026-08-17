import User from "../../../database/models/user.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";
import bcrypt from "bcryptjs";

export const getAllUsers = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(User.find().select("-password"), req.query)
    .filter()
    .search(["name", "username", "jobTitle", "phone"])
    .sort()
    .paginate();

  const users = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});

export const getUserStats = catchAsync(async (req, res) => {
  const total = await User.countDocuments();
  const active = await User.countDocuments({ isActive: true });
  const morning = await User.countDocuments({ shift: "morning", isActive: true });
  const evening = await User.countDocuments({ shift: "evening", isActive: true });
  const night = await User.countDocuments({ shift: "night", isActive: true });

  res.status(200).json({
    status: "success",
    data: {
      total,
      active,
      shifts: { morning, evening, night },
    },
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
  const { name, username, password, role, shift, phone, salary, jobTitle, notes } = req.body;
  if (!name || !username || !password) {
    return next(new AppError("الاسم واسم المستخدم وكلمة المرور مطلوبة", 400));
  }

  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) {
    return next(new AppError("اسم المستخدم موجود بالفعل", 400));
  }

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    password,
    role: role || "front",
    shift: shift || "morning",
    phone: phone || "",
    salary: Number(salary) || 0,
    jobTitle: jobTitle || "",
    notes: notes || "",
  });
  user.password = undefined;

  res.status(201).json({
    status: "success",
    data: { user },
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };

  // If password was provided and not empty, hash it
  if (updateData.password && updateData.password.trim().length >= 6) {
    updateData.password = await bcrypt.hash(updateData.password.trim(), 12);
  } else {
    delete updateData.password;
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
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
    data: { user: { _id: user._id, name: user.name, isActive: user.isActive } },
  });
});
