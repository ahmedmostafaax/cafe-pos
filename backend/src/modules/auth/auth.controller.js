import jwt from "jsonwebtoken";
import User from "../../../database/models/user.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError("اسم المستخدم وكلمة المرور مطلوبان", 400));
  }

  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("اسم المستخدم أو كلمة المرور غير صحيحة", 401));
  }

  if (!user.isActive) {
    return next(new AppError("هذا الحساب معطل", 401));
  }

  createSendToken(user, 200, res);
});

export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

export const createAdmin = catchAsync(async (req, res, next) => {
  // يستخدم مرة واحدة لإنشاء الأدمن الأول
  const exists = await User.findOne({ role: "admin" });
  if (exists) {
    return next(new AppError("يوجد أدمن بالفعل", 400));
  }

  const admin = await User.create({
    name: "Ahmed Mostafa",
    username: "ahmed",
    password: "ahmed123",
    role: "admin",
  });

  createSendToken(admin, 201, res);
});
