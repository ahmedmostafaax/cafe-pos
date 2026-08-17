import mongoose from "mongoose";

const staffCallSchema = new mongoose.Schema(
  {
    tableNo: { type: String, required: true },
    type: {
      type: String,
      enum: ["bill", "water", "napkin", "help", "other"],
      default: "help",
    },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "acked", "done"],
      default: "pending",
    },
    zone: String,
    ackedAt: Date,
    doneAt: Date,
    ackedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("StaffCall", staffCallSchema);
