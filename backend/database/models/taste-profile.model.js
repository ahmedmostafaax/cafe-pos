import mongoose from "mongoose";

const tasteProfileSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, unique: true, required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String, default: "" },
    itemCounts: { type: Map, of: Number, default: {} },
    optionPrefs: { type: mongoose.Schema.Types.Mixed, default: {} },
    noSugar: { type: Boolean, default: false },
    altMilk: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Menu" }],
    lastOrderItems: [
      {
        menuId: mongoose.Schema.Types.ObjectId,
        name: String,
        qty: Number,
        options: mongoose.Schema.Types.Mixed,
      },
    ],
    totalOrders: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    lastSeenAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("TasteProfile", tasteProfileSchema);
