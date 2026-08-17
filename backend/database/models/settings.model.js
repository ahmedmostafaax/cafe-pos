import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    busyMode: { type: Boolean, default: false },
    busyEtaExtra: { type: Number, default: 10 },
    onlinePaused: { type: Boolean, default: false },
    hideSlowItems: { type: Boolean, default: true },
    slowPrepMinutes: { type: Number, default: 12 },
    restaurantName: { type: String, default: "GODZ Café" },
    branches: [
      {
        name: String,
        address: String,
        phone: String,
        hours: String,
        mapUrl: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);

