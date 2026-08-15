import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    tableNo: {
      type: String,
      required: [true, "رقم الطاولة مطلوب"],
      unique: true,
      trim: true,
    },
    seats: {
      type: Number,
      default: 4,
    },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved"],
      default: "available",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Table = mongoose.model("Table", tableSchema);
export default Table;
