import Menu from "../../../database/models/menu.model.js";
import Settings from "../../../database/models/settings.model.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

export const getAllMenu = catchAsync(async (req, res) => {
  const filter = {};
  // للزبون العام
  const isPublic = req.query.public === "1" || req.path.includes("public");
  if (isPublic) {
    filter.available = { $ne: false };
    filter.soldOut = { $ne: true };
    const settings = await Settings.findOne({ key: "main" });
    if (settings?.busyMode && settings.hideSlowItems) {
      filter.prepMinutes = { $lte: settings.slowPrepMinutes || 12 };
    }
  }
  const menu = await Menu.find(filter).populate("category").sort("nameAr name");
  res.status(200).json({ status: "success", data: { menu } });
});

export const getPublicMenu = catchAsync(async (req, res) => {
  req.query.public = "1";
  const filter = { available: { $ne: false }, soldOut: { $ne: true } };
  const settings = await Settings.findOne({ key: "main" });
  if (settings?.busyMode && settings.hideSlowItems) {
    filter.$or = [
      { prepMinutes: { $lte: settings.slowPrepMinutes || 12 } },
      { prepMinutes: { $exists: false } },
    ];
  }
  const menu = await Menu.find(filter).populate("category").sort("nameAr name");
  res.status(200).json({
    status: "success",
    data: {
      menu,
      onlinePaused: settings?.onlinePaused || false,
      busyMode: settings?.busyMode || false,
    },
  });
});

export const createMenu = catchAsync(async (req, res) => {
  const item = await Menu.create(req.body);
  res.status(201).json({ status: "success", data: { item } });
});

export const updateMenu = catchAsync(async (req, res, next) => {
  const item = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) return next(new AppError("غير موجود", 404));
  const io = req.app.get("io");
  io?.emit("menu_updated", item);
  res.status(200).json({ status: "success", data: { item } });
});

export const toggleMenu = catchAsync(async (req, res, next) => {
  const item = await Menu.findById(req.params.id);
  if (!item) return next(new AppError("غير موجود", 404));
  item.available = !item.available;
  await item.save();
  const io = req.app.get("io");
  io?.emit("menu_updated", item);
  res.status(200).json({ status: "success", data: { item } });
});

export const setSoldOut = catchAsync(async (req, res, next) => {
  const soldOut = req.body.soldOut !== false;
  const item = await Menu.findByIdAndUpdate(
    req.params.id,
    { soldOut, available: !soldOut },
    { new: true }
  );
  if (!item) return next(new AppError("غير موجود", 404));
  const io = req.app.get("io");
  io?.emit("menu_updated", item);
  res.status(200).json({ status: "success", data: { item } });
});

export const deleteMenu = catchAsync(async (req, res, next) => {
  const item = await Menu.findByIdAndDelete(req.params.id);
  if (!item) return next(new AppError("غير موجود", 404));
  res.status(204).json({ status: "success", data: null });
});
