import Attendance from "../../../database/models/attendance.model.js";
import User from "../../../database/models/user.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const checkIn = catchAsync(async (req, res, next) => {
  const shift = req.body.shift || "morning";
  const date = todayStr();

  let record = await Attendance.findOne({ user: req.user._id, date, shift });
  if (record?.checkIn) return next(new AppError("تم تسجيل الحضور مسبقاً لهذا الشفت", 400));

  if (!record) {
    record = await Attendance.create({
      user: req.user._id,
      date,
      shift,
      checkIn: new Date(),
      status: "present",
    });
  } else {
    record.checkIn = new Date();
    await record.save();
  }

  res.status(200).json({ status: "success", data: { record } });
});

export const checkOut = catchAsync(async (req, res, next) => {
  const shift = req.body.shift || "morning";
  const date = todayStr();

  const record = await Attendance.findOne({ user: req.user._id, date, shift });
  if (!record?.checkIn) return next(new AppError("لم يتم تسجيل الحضور بعد", 400));
  if (record.checkOut) return next(new AppError("تم تسجيل الانصراف مسبقاً", 400));

  record.checkOut = new Date();
  await record.save();

  res.status(200).json({ status: "success", data: { record } });
});

export const getTodayAttendance = catchAsync(async (req, res) => {
  const date = todayStr();
  const records = await Attendance.find({ date })
    .populate("user", "name username role")
    .sort("-checkIn");

  res.status(200).json({ status: "success", data: { records, date } });
});

export const getMyAttendance = catchAsync(async (req, res) => {
  const records = await Attendance.find({ user: req.user._id })
    .sort("-date")
    .limit(30);
  res.status(200).json({ status: "success", data: { records } });
});

export const getOnShift = catchAsync(async (req, res) => {
  const date = todayStr();
  const records = await Attendance.find({
    date,
    checkIn: { $exists: true },
    $or: [{ checkOut: null }, { checkOut: { $exists: false } }],
  }).populate("user", "name username role");

  res.status(200).json({
    status: "success",
    data: {
      onShift: records,
      morning: records.filter((r) => r.shift === "morning"),
      evening: records.filter((r) => r.shift === "evening"),
      night: records.filter((r) => r.shift === "night"),
    },
  });
});
