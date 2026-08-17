import TableSession from "../../../database/models/tableSession.model.js";
import Order from "../../../database/models/order.model.js";
import Menu from "../../../database/models/menu.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const genGuest = () => `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const listOpenSessions = catchAsync(async (req, res) => {
  const sessions = await TableSession.find({
    status: { $in: ["open", "ordering", "paying"] },
  }).sort("-updatedAt");

  const mapped = sessions.map((s) => {
    const paid = (s.payments || []).filter((p) => p.status === "paid").length;
    const totalPay = (s.payments || []).length;
    const subtotal = (s.items || []).reduce((a, i) => a + (i.price || 0) * (i.qty || 0), 0);
    return {
      ...s.toObject(),
      guestsCount: (s.guests || []).length,
      paidCount: paid,
      paymentsCount: totalPay,
      subtotal,
    };
  });

  res.status(200).json({ status: "success", data: { sessions: mapped } });
});

export const openOrGetSession = catchAsync(async (req, res) => {
  const tableNo = String(req.params.tableNo);
  let session = await TableSession.findOne({
    tableNo,
    status: { $in: ["open", "ordering", "paying"] },
  }).sort("-createdAt");

  if (!session) {
    session = await TableSession.create({
      tableNo,
      code: genCode(),
      status: "open",
      guests: [],
      items: [],
      payments: [],
    });
  }

  res.status(200).json({ status: "success", data: { session } });
});

export const getSession = catchAsync(async (req, res) => {
  const tableNo = String(req.params.tableNo);
  let session = await TableSession.findOne({
    tableNo,
    status: { $ne: "closed" },
  }).sort("-createdAt");

  if (!session) {
    session = await TableSession.create({
      tableNo,
      code: genCode(),
      status: "open",
      guests: [],
      items: [],
    });
  }

  res.status(200).json({ status: "success", data: { session } });
});

export const joinSession = catchAsync(async (req, res) => {
  const tableNo = String(req.params.tableNo);
  const name = (req.body.name || "").trim() || "ضيف";

  let session = await TableSession.findOne({
    tableNo,
    status: { $in: ["open", "ordering", "paying"] },
  }).sort("-createdAt");

  if (!session) {
    session = await TableSession.create({
      tableNo,
      code: genCode(),
      status: "open",
      guests: [],
      items: [],
    });
  }

  const guestId = genGuest();
  session.guests.push({ guestId, name, joinedAt: new Date() });
  if (session.status === "open") session.status = "ordering";
  await session.save();

  req.app.get("io")?.emit("session_updated", session);

  res.status(200).json({
    status: "success",
    data: { session, guestId, guestName: name },
  });
});

export const addItemToSession = catchAsync(async (req, res, next) => {
  const tableNo = String(req.params.tableNo);
  const { menuId, qty = 1, guestId, notes, options } = req.body;

  const session = await TableSession.findOne({
    tableNo,
    status: { $in: ["open", "ordering"] },
  }).sort("-createdAt");

  if (!session) return next(new AppError("الجلسة غير متاحة", 404));

  const menu = await Menu.findById(menuId);
  if (!menu) return next(new AppError("الصنف غير موجود", 400));

  const existing = session.items.find(
    (i) => String(i.menuId) === String(menuId) && i.addedBy === guestId
  );
  if (existing) existing.qty += Number(qty) || 1;
  else {
    session.items.push({
      menuId: menu._id,
      name: menu.nameAr || menu.name,
      station: menu.station || "kitchen",
      price: menu.price,
      qty: Number(qty) || 1,
      options: options || {},
      addedBy: guestId || "unknown",
      notes: notes || "",
    });
  }
  session.status = "ordering";
  await session.save();
  req.app.get("io")?.emit("session_updated", session);
  res.status(200).json({ status: "success", data: { session } });
});

export const removeItem = catchAsync(async (req, res, next) => {
  const tableNo = String(req.params.tableNo);
  const session = await TableSession.findOne({
    tableNo,
    status: { $in: ["open", "ordering"] },
  }).sort("-createdAt");
  if (!session) return next(new AppError("الجلسة غير موجودة", 404));
  session.items = session.items.filter((i) => String(i._id) !== req.params.itemId);
  await session.save();
  req.app.get("io")?.emit("session_updated", session);
  res.status(200).json({ status: "success", data: { session } });
});

export const submitSessionOrder = catchAsync(async (req, res, next) => {
  const tableNo = String(req.params.tableNo);
  const session = await TableSession.findOne({
    tableNo,
    status: { $in: ["ordering", "open"] },
  }).sort("-createdAt");
  if (!session || !session.items.length) return next(new AppError("لا توجد أصناف", 400));

  const subtotal = session.items.reduce((s, i) => s + i.price * i.qty, 0);
  const serviceCharge = Math.round((subtotal * (session.serviceChargePercent || 12)) / 100);
  const total = Math.max(0, subtotal + serviceCharge - (session.discount || 0));

  const order = await Order.create({
    tableId: tableNo,
    sessionId: session._id,
    items: session.items.map((i) => ({
      menuId: i.menuId,
      name: i.name,
      station: i.station,
      price: i.price,
      qty: i.qty,
      options: i.options,
      notes: i.notes,
      addedBy: i.addedBy,
      status: "pending",
    })),
    totalPrice: total,
    serviceCharge,
    discount: session.discount || 0,
    guests: session.guests.length || 1,
    dineIn: true,
    status: "active",
    paymentStatus: "unpaid",
    timeline: [{ status: "received", label: "تم استلام الطلب", at: new Date() }],
  });

  session.status = "paying";
  session.orderId = order._id;
  await session.save();

  const io = req.app.get("io");
  io?.emit("order_created", order);
  io?.emit("session_updated", session);
  io?.emit("notification", {
    type: "new_order",
    title: "طلب ترابيزة",
    message: `ترابيزة ${tableNo} — ${total} ج.م`,
  });

  res.status(201).json({ status: "success", data: { order, session } });
});

export const setupSplit = catchAsync(async (req, res, next) => {
  const tableNo = String(req.params.tableNo);
  const session = await TableSession.findOne({
    tableNo,
    status: { $in: ["paying", "ordering"] },
  }).sort("-createdAt");
  if (!session) return next(new AppError("الجلسة غير موجودة", 404));

  const subtotal = session.items.reduce((s, i) => s + i.price * i.qty, 0);
  const service = Math.round((subtotal * (session.serviceChargePercent || 12)) / 100);
  const total = Math.max(0, subtotal + service - (session.discount || 0));
  session.splitMode = req.body.mode || "equal";

  const guests = session.guests.length ? session.guests : [{ guestId: "all", name: "الكل" }];
  const share = Math.ceil(total / Math.max(1, guests.length));
  session.payments = guests.map((g) => ({
    guestId: g.guestId,
    name: g.name,
    amount: share,
    status: "pending",
  }));
  await session.save();
  req.app.get("io")?.emit("session_updated", session);
  res.status(200).json({ status: "success", data: { session, total } });
});

export const markGuestPaid = catchAsync(async (req, res, next) => {
  const tableNo = String(req.params.tableNo);
  const { guestId, payMethod } = req.body;
  const session = await TableSession.findOne({ tableNo }).sort("-createdAt");
  if (!session) return next(new AppError("الجلسة غير موجودة", 404));

  const pay = session.payments.find((p) => p.guestId === guestId);
  if (!pay) return next(new AppError("حصة الضيف غير موجودة", 404));
  pay.status = "paid";
  pay.payMethod = payMethod || "cash";
  pay.paidAt = new Date();
  await session.save();

  const paidCount = session.payments.filter((p) => p.status === "paid").length;
  const allPaid = session.payments.length > 0 && paidCount === session.payments.length;
  if (allPaid && session.orderId) {
    await Order.findByIdAndUpdate(session.orderId, {
      paymentStatus: "paid",
      payMethod: "split",
    });
    session.status = "closed";
    session.closedAt = new Date();
    await session.save();
  }

  req.app.get("io")?.emit("session_updated", session);
  res.status(200).json({ status: "success", data: { session, allPaid } });
});
