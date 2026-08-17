import StaffCall from "../../../database/models/staffCall.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const createCall = catchAsync(async (req, res) => {
  const call = await StaffCall.create({
    tableNo: String(req.body.tableNo || ""),
    type: req.body.type || "help",
    note: req.body.note || "",
    zone: req.body.zone || "",
  });

  const io = req.app.get("io");
  if (io) {
    const payload = {
      type: "staff_call",
      title: "🔔 نداء طاولة جديد",
      message: `طاولة ${call.tableNo} — ${call.type}`,
      tableId: call.tableNo,
      callType: call.type,
      note: call.note,
      callId: call._id,
      createdAt: call.createdAt,
    };
    io.emit("staff_call", call);
    io.emit("service_call", { _id: call._id, tableId: call.tableNo, type: call.type, note: call.note, status: "open", createdAt: call.createdAt });
    io.emit("notification", payload);
    io.to("managers").emit("notification", payload);
  }

  res.status(201).json({ status: "success", data: { call } });
});

export const getPending = catchAsync(async (req, res) => {
  const calls = await StaffCall.find({ status: { $in: ["pending", "acked"] } })
    .sort("-createdAt")
    .limit(50);
  res.status(200).json({ status: "success", data: { calls } });
});

export const ackCall = catchAsync(async (req, res, next) => {
  const call = await StaffCall.findByIdAndUpdate(
    req.params.id,
    { status: "acked", ackedAt: new Date(), ackedBy: req.user?._id },
    { new: true }
  );
  if (!call) return next(new AppError("غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("staff_call", call);
    io.emit("service_call_updated", { _id: call._id, tableId: call.tableNo, status: "acknowledged" });
  }

  res.status(200).json({ status: "success", data: { call } });
});

export const doneCall = catchAsync(async (req, res, next) => {
  const call = await StaffCall.findByIdAndUpdate(
    req.params.id,
    { status: "done", doneAt: new Date() },
    { new: true }
  );
  if (!call) return next(new AppError("غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("staff_call", call);
    io.emit("service_call_updated", { _id: call._id, tableId: call.tableNo, status: "resolved" });
  }

  res.status(200).json({ status: "success", data: { call } });
});
