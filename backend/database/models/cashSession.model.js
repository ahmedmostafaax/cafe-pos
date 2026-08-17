import mongoose from "mongoose";

const cashSessionSchema = new mongoose.Schema(
  {
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    openingFloat: { type: Number, required: true, default: 0 },
    closingCash: Number,
    expectedCash: Number,
    variance: Number,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    notes: String,
    report: { type: Object },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("CashSession", cashSessionSchema);
