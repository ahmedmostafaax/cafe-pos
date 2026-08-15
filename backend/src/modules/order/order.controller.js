import Order from "../../../database/models/order.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiFeature from "../../utils/ApiFeature.js";

export const getAllOrders = catchAsync(async (req, res, next) => {
  const features = new ApiFeature(
    Order.find().populate("createdBy", "name username").sort("-createdAt"),
    req.query
  )
    .filter()
    .search(["orderNumber", "tableId"])
    .paginate();

  const orders = await features.mongooseQuery;

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

export const getActiveOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    status: { $in: ["active", "preparing", "ready", "unpaid"] },
  })
    .populate("createdBy", "name username")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "createdBy",
    "name username"
  );
  if (!order) return next(new AppError("الطلب غير موجود", 404));

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// للعميل يتابع بالـ publicToken
export const getOrderByToken = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ publicToken: req.params.token });
  if (!order) return next(new AppError("الطلب غير موجود", 404));

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

export const createOrder = catchAsync(async (req, res, next) => {
  const orderData = {
    ...req.body,
    createdBy: req.user?._id,
  };

  const order = await Order.create(orderData);

  const io = req.app.get("io");
  if (io) {
    io.emit("order_created", order);
    io.emit("notification", {
      type: "new_order",
      title: "طلب جديد",
      message: `طلب ${order.orderNumber} من ترابيزة ${order.tableId} - ${order.totalPrice} جنيه`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      total: order.totalPrice,
    });
  }

  res.status(201).json({
    status: "success",
    data: { order },
  });
});

// طلب من العميل (من غير لوجين) عن طريق الترابيزة
export const createPublicOrder = catchAsync(async (req, res, next) => {
  const { tableId, items, totalPrice, guests, notes, dineIn = true } = req.body;

  if (!tableId || !items?.length) {
    return next(new AppError("الترابيزة والأصناف مطلوبة", 400));
  }

  const order = await Order.create({
    tableId,
    items,
    totalPrice,
    guests: guests || 1,
    dineIn,
    notes: notes || "",
    status: "active",
    paymentStatus: "unpaid",
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("order_created", order);
    io.emit("notification", {
      type: "new_order",
      title: "طلب جديد من العميل",
      message: `طلب ${order.orderNumber} من ترابيزة ${order.tableId} - ${order.totalPrice} جنيه`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      total: order.totalPrice,
      publicToken: order.publicToken,
    });
  }

  res.status(201).json({
    status: "success",
    data: { order },
  });
});

export const updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "name username");

  if (!order) return next(new AppError("الطلب غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("order_updated", order);
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError("الحالة مطلوبة", 400));

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) return next(new AppError("الطلب غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("order_updated", order);
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// تأكيد الدفع (من الكاشير أو بعد التحويل)
export const confirmPayment = catchAsync(async (req, res, next) => {
  const { payMethod } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      paymentStatus: "paid",
      payMethod: payMethod || "cashier",
      status: orderStatusAfterPay(req.body.status),
    },
    { new: true }
  );

  if (!order) return next(new AppError("الطلب غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("order_updated", order);
    io.emit("notification", {
      type: "payment",
      title: "تم استلام الدفع",
      message: `تم دفع طلب ${order.orderNumber} (${order.payMethod}) - ${order.totalPrice} جنيه`,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

function orderStatusAfterPay(s) {
  return s || "preparing";
}

// العميل يقول "حولت" → حالة pending_transfer
export const markTransferPending = catchAsync(async (req, res, next) => {
  const { payMethod } = req.body;

  const order = await Order.findOneAndUpdate(
    { publicToken: req.params.token },
    {
      paymentStatus: "pending_transfer",
      payMethod: payMethod || "instapay",
    },
    { new: true }
  );

  if (!order) return next(new AppError("الطلب غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("order_updated", order);
    io.emit("notification", {
      type: "transfer_pending",
      title: "تحويل في الانتظار",
      message: `العميل حول لطلب ${order.orderNumber} عبر ${order.payMethod} - راجع التحويل`,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// تقييم من العميل
export const rateOrder = catchAsync(async (req, res, next) => {
  const { rating, ratingComment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError("التقييم يجب أن يكون من 1 إلى 5", 400));
  }

  const order = await Order.findOneAndUpdate(
    { publicToken: req.params.token },
    {
      rating,
      ratingComment: ratingComment || "",
      ratedAt: new Date(),
    },
    { new: true }
  );

  if (!order) return next(new AppError("الطلب غير موجود", 404));

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

export const deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return next(new AppError("الطلب غير موجود", 404));

  res.status(204).json({ status: "success", data: null });
});
