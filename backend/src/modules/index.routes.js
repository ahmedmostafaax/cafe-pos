import authRouter from "./auth/auth.routes.js";
import categoryRouter from "./category/category.routes.js";
import menuRouter from "./menu/menu.routes.js";
import tableRouter from "./table/table.routes.js";
import orderRouter from "./order/order.routes.js";
import userRouter from "./user/user.routes.js";
import settingsRouter from "./settings/settings.routes.js";
import offerRouter from "./offer/offer.routes.js";
import couponRouter from "./coupon/coupon.routes.js";
import attendanceRouter from "./attendance/attendance.routes.js";
import customerRouter from "./customer/customer.routes.js";
import AppError from "../utils/AppError.js";
import globalError from "../middleware/globalError.js";

const bootstrap = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api/tables", tableRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/users", userRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/offers", offerRouter);
  app.use("/api/coupons", couponRouter);
  app.use("/api/attendance", attendanceRouter);

  app.use((req, res, next) => next(new AppError(`المسار غير موجود: ${req.originalUrl}`, 404)));
  app.use(globalError);
};

export default bootstrap;
