import WasteLog from "../../../database/models/wasteLog.model.js";
import catchAsync from "../../utils/catchAsync.js";
export const createWaste = catchAsync(async (req, res) => {
  const log = await WasteLog.create({ ...req.body, recordedBy: req.user?._id });
  res.status(201).json({ status: "success", data: { log } });
});
export const getWaste = catchAsync(async (req, res) => {
  const logs = await WasteLog.find().sort("-createdAt").limit(100);
  res.status(200).json({ status: "success", data: { logs } });
});
export const wasteSummary = catchAsync(async (req, res) => {
  const logs = await WasteLog.find().sort("-createdAt").limit(200);
  res.status(200).json({ status: "success", data: { top: [], totalEvents: logs.length, logs } });
});
