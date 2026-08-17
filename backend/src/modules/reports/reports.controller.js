import Order from "../../../database/models/order.model.js";
import catchAsync from "../../utils/catchAsync.js";
export const dailyReport = catchAsync(async (req, res) => {
  const day = req.query.date || new Date().toISOString().slice(0, 10);
  const start = new Date(day + "T00:00:00.000Z");
  const end = new Date(day + "T23:59:59.999Z");
  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
  const valid = orders.filter((o) => o.status !== "cancelled");
  const paid = valid.filter((o) => o.paymentStatus === "paid" || ["archived", "served"].includes(o.status));
  const sales = paid.reduce((s, o) => s + (o.totalPrice || 0), 0);
  res.status(200).json({ status: "success", data: { date: day, ordersCount: valid.length, cancelledCount: orders.length - valid.length, sales, avgTicket: paid.length ? Math.round(sales / paid.length) : 0, topItems: [], peakHour: null, wasteCount: 0 } });
});
export const dailyCsv = catchAsync(async (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.send("orderNumber,total\n");
});
