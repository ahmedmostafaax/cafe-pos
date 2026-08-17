import ServiceCall from "../../../database/models/service-call.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";

export const createServiceCall = catchAsync(async (req, res, next) => {
  const { tableId, type, note } = req.body;
  if (!tableId || !type) return next(new AppError("الترابيزة ونوع الطلب مطلوبان", 400));

  const existing = await ServiceCall.findOne({ tableId, type, status: { $in: ["open", "acknowledged"] } });
  if (existing) {
    return res.status(200).json({ status: "success", data: { call: existing, duplicate: true } });
  }

  const call = await ServiceCall.create({ tableId, type, note: note || "" });

  const io = req.app.get("io");
  if (io) {
    const payload = {
      type: "service_call",
      title: "🔔 نداء طاولة جديد",
      message: `طاولة ${tableId} تطلب: ${type}`,
      tableId,
      callType: type,
      note: note || "",
      serviceCallId: call._id,
      createdAt: call.createdAt,
    };
    io.emit("service_call", call);
    io.emit("notification", payload);
    io.to("managers").emit("notification", payload);
  }

  res.status(201).json({ status: "success", data: { call } });
});

export const getServiceCalls = catchAsync(async (req, res) => {
  const calls = await ServiceCall.find({ status: { $ne: "resolved" } })
    .populate("handledBy", "name")
    .sort("-createdAt");
  res.status(200).json({ status: "success", data: { calls } });
});

export const updateServiceCall = catchAsync(async (req, res, next) => {
  const nextStatus = req.body.status;
  if (!nextStatus) return next(new AppError("الحالة مطلوبة", 400));

  const call = await ServiceCall.findByIdAndUpdate(
    req.params.id,
    {
      status: nextStatus,
      handledBy: req.user?._id,
      handledAt: nextStatus === "resolved" ? new Date() : undefined,
    },
    { new: true }
  );

  if (!call) return next(new AppError("النداء غير موجود", 404));

  const io = req.app.get("io");
  if (io) {
    io.emit("service_call_updated", call);
    if (nextStatus === "resolved") {
      io.emit("notification", {
        type: "service_call_resolved",
        title: "تم تلبية النداء",
        message: `تم تلبية نداء طاولة ${call.tableId}`,
        serviceCallId: call._id,
      });
    }
  }

  res.status(200).json({ status: "success", data: { call } });
});
