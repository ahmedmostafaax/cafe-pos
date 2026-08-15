import jwt from "jsonwebtoken";
import User from "../../database/models/user.model.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("يجب تسجيل الدخول أولاً", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError("المستخدم غير موجود", 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError("هذا الحساب معطل", 401));
  }

  req.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("ليس لديك صلاحية للقيام بهذا الإجراء", 403)
      );
    }
    next();
  };
};
