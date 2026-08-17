import mongoose from "mongoose";
export default mongoose.model("Inventory", new mongoose.Schema({
  name: String, unit: { type: String, default: "قطعة" }, qty: { type: Number, default: 0 }, minQty: { type: Number, default: 5 },
}, { timestamps: true }));
