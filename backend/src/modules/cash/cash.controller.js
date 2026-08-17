import CashSession from "../../../database/models/cashSession.model.js";
import Order from "../../../database/models/order.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const getCurrent = catchAsync(async (req, res) => {
  const session = await CashSession.findOne({ status: "open" })
    .populate("openedBy", "name")
    .sort("-openedAt");
  res.status(200).json({ status: "success", data: { session } });
});

export const openSession = catchAsync(async (req, res, next) => {
  const existing = await CashSession.findOne({ status: "open" });
  if (existing) return next(new AppError("يوجد وردية مفتوحة بالفعل", 400));
  const session = await CashSession.create({
    openedBy: req.user._id,
    openingFloat: Number(req.body.openingFloat) || 0,
  });
  res.status(201).json({ status: "success", data: { session } });
});

export const closeSession = catchAsync(async (req, res, next) => {
  const session = await CashSession.findOne({ status: "open" });
  if (!session) return next(new AppError("لا توجد وردية مفتوحة", 400));

  const from = session.openedAt;
  const paid = await Order.find({
    createdAt: { $gte: from },
    paymentStatus: "paid",
  });

  const cashSales = paid
    .filter((o) => !o.payMethod || ["cash", "cashier", ""].includes(o.payMethod))
    .reduce((s, o) => s + (o.totalPrice || 0), 0);
  const electronicSales = paid
    .filter((o) => ["instapay", "wallet", "card", "online"].includes(o.payMethod))
    .reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalSales = paid.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const expectedCash = session.openingFloat + cashSales;
  const closingCash = Number(req.body.closingCash) || 0;
  const variance = closingCash - expectedCash;

  session.closingCash = closingCash;
  session.expectedCash = expectedCash;
  session.variance = variance;
  session.status = "closed";
  session.closedBy = req.user._id;
  session.closedAt = new Date();
  session.notes = req.body.notes || "";
  session.report = { cashSales, electronicSales, totalSales, ordersCount: paid.length };
  await session.save();

  res.status(200).json({
    status: "success",
    data: {
      session,
      report: {
        openingFloat: session.openingFloat,
        cashSales,
        electronicSales,
        totalSales,
        expectedCash,
        closingCash,
        variance,
        ordersCount: paid.length,
      },
    },
  });
});

export const lastClosed = catchAsync(async (req, res) => {
  const session = await CashSession.findOne({ status: "closed" })
    .populate("openedBy closedBy", "name")
    .sort("-closedAt");
  res.status(200).json({ status: "success", data: { session } });
});
