import Settings from "../../../database/models/settings.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";

export const getSetting = catchAsync(async (req, res, next) => {
  const setting = await Settings.findOne({ key: req.params.key });
  if (!setting) {
    return res.status(200).json({
      status: "success",
      data: { value: null },
    });
  }

  res.status(200).json({
    status: "success",
    data: { value: setting.value },
  });
});

export const setSetting = catchAsync(async (req, res, next) => {
  const setting = await Settings.findOneAndUpdate(
    { key: req.params.key },
    { value: req.body.value },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { setting },
  });
});

export const getAllSettings = catchAsync(async (req, res, next) => {
  const settings = await Settings.find();
  res.status(200).json({
    status: "success",
    data: { settings },
  });
});
