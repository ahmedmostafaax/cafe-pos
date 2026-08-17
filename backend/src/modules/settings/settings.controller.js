import Settings from "../../../database/models/settings.model.js";
import catchAsync from "../../utils/catchAsync.js";

async function getOrCreate() {
  let s = await Settings.findOne({ key: "main" });
  if (!s) {
    s = await Settings.create({
      key: "main",
      branches: [
        {
          name: "الفرع الرئيسي",
          address: "القاهرة",
          phone: "01000000000",
          hours: "9 ص — 12 م",
          mapUrl: "https://maps.google.com",
        },
      ],
    });
  }
  return s;
}

export const getPublicSettings = catchAsync(async (req, res) => {
  const s = await getOrCreate();
  res.status(200).json({
    status: "success",
    data: {
      busyMode: s.busyMode,
      onlinePaused: s.onlinePaused,
      restaurantName: s.restaurantName,
      branches: s.branches || [],
      hideSlowItems: s.hideSlowItems,
      slowPrepMinutes: s.slowPrepMinutes,
      busyEtaExtra: s.busyEtaExtra,
    },
  });
});

export const getSettings = catchAsync(async (req, res) => {
  const s = await getOrCreate();
  res.status(200).json({ status: "success", data: { settings: s } });
});

export const updateSettings = catchAsync(async (req, res) => {
  const s = await getOrCreate();
  const fields = [
    "busyMode",
    "busyEtaExtra",
    "onlinePaused",
    "hideSlowItems",
    "slowPrepMinutes",
    "restaurantName",
    "branches",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) s[f] = req.body[f];
  });
  await s.save();
  const io = req.app.get("io");
  io?.emit("settings_updated", {
    busyMode: s.busyMode,
    onlinePaused: s.onlinePaused,
  });
  res.status(200).json({ status: "success", data: { settings: s } });
});
