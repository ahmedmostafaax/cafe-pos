import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    shift: {
      type: String,
      enum: ["morning", "evening", "night"],
      default: "morning",
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1, shift: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
