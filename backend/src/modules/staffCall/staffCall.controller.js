import StaffCall from "../../../database/models/staffCall.model.js";
import ServiceCall from "../../../database/models/service-call.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

const mapType = (type) => {
  const t = String(type || "help");
  if (t === "napkin") return "napkins";
  if (t === "help" || t === "other" || t === "staff") return "staff";
  if (["bill", "water", "napkins"].includes(t)) return t;
  return "staff";
};

const mapStatusToService = (status) => {
  if (status === "acked") return "acknowledged";
  if (status === "done") return "resolved";
  return "open";
};

export const createCall = catchAsync(async (req, res) => {
  const tableNo = String(req.body.tableNo || req.body.tableId || "");
  const type = req.body.type || "help";
  const note = req.body.note || "";

  const call = await StaffCall.create({
    tableNo,
    type: ["bill", "water", "napkin", "help", "other"].includes(type) ? type : "help",
    note,
    zone: req.body.zone || "",
  });

  // Mirror into ServiceCall so manager Service Calls page lists it
  let serviceCall = null;
  try {
    const svcType = mapType(type);
    serviceCall = await ServiceCall.findOne({
      tableId: tableNo,
      type: svcType,
      status: { $in: ["open", "acknowledged"] },
    });
    if (!serviceCall) {
      serviceCall = await ServiceCall.create({
        tableId: tableNo,
        type: svcType,
        note,
        status: "open",
      });
    }
  } catch (e) {
    console.warn("ServiceCall mirror failed:", e.message);
  }

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
      serviceCallId: serviceCall?._id,
      createdAt: call.createdAt,
    };
    io.emit("staff_call", call);
    io.emit("service_call", serviceCall || {
      _id: call._id,
      tableId: call.tableNo,
      type: mapType(call.type),
      note: call.note,
      status: "open",
      createdAt: call.createdAt,
    });
    io.emit("notification", payload);
    io.to("managers").emit("notification", payload);
  }

  res.status(201).json({ status: "success", data: { call, serviceCall } });
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

  try {
    await ServiceCall.updateMany(
      { tableId: call.tableNo, status: "open" },
      { status: "acknowledged", handledBy: req.user?._id }
    );
  } catch {}

  const io = req.app.get("io");
  if (io) {
    io.emit("staff_call", call);
    io.emit("service_call_updated", {
      _id: call._id,
      tableId: call.tableNo,
      status: "acknowledged",
    });
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

  try {
    await ServiceCall.updateMany(
      { tableId: call.tableNo, status: { $in: ["open", "acknowledged"] } },
      { status: "resolved", handledBy: req.user?._id, handledAt: new Date() }
    );
  } catch {}

  const io = req.app.get("io");
  if (io) {
    io.emit("staff_call", call);
    io.emit("service_call_updated", {
      _id: call._id,
      tableId: call.tableNo,
      status: "resolved",
    });
  }

  res.status(200).json({ status: "success", data: { call } });
});

