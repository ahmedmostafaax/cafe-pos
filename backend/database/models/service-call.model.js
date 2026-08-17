import mongoose from "mongoose";

const serviceCallSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true, index: true },
    type: { type: String, enum: ["staff", "bill", "water", "napkins"], required: true },
    status: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open", index: true },
    note: { type: String, default: "" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handledAt: Date,
    responseTimeMs: { type: Number, default: 0 },
    zone: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceCall", serviceCallSchema);
