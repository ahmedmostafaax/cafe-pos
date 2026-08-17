import mongoose from "mongoose";

const wasteLogSchema = new mongoose.Schema(
  {
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: "Menu" },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
    itemName: { type: String, default: "" },
    name: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    reason: {
      type: String,
      enum: ["expired", "returned", "cancelled", "prep_waste", "other"],
      default: "other",
    },
    note: { type: String, default: "" },
    shift: { type: String, enum: ["morning", "evening", "night"], default: "evening" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

wasteLogSchema.index({ createdAt: -1 });

export default mongoose.models.WasteLog || mongoose.model("WasteLog", wasteLogSchema);
