import Order from "../../../database/models/order.model.js";
import User from "../../../database/models/user.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
export const listOnline = catchAsync(async (req, res) => {
  const orders = await Order.find({ tableId: "ONLINE", status: { $nin: ["archived", "cancelled"] } }).populate("deliveryAssignedTo", "name").sort("-createdAt").limit(50);
  res.status(200).json({ status: "success", data: { orders } });
});
export const availableRiders = catchAsync(async (req, res) => {
  const riders = await User.find({ role: { $in: ["delivery", "front"] } }).select("name username role");
  res.status(200).json({ status: "success", data: { riders } });
});
export const assign = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { deliveryAssignedTo: req.body.userId }, { new: true }).populate("deliveryAssignedTo", "name");
  if (!order) return next(new AppError("غير موجود", 404));
  res.status(200).json({ status: "success", data: { order } });
});
export const setDeliveryStatus = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError("غير موجود", 404));
  order.extra = order.extra || {};
  order.extra.deliveryStatus = req.body.deliveryStatus;
  if (req.body.deliveryStatus === "delivered") order.status = "served";
  await order.save();
  res.status(200).json({ status: "success", data: { order } });
});
