import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    guestId: String,
    name: String,
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: "Menu" },
    name: String,
    station: { type: String, default: "kitchen" },
    price: Number,
    qty: { type: Number, default: 1 },
    options: { type: Object, default: {} },
    addedBy: String,
    notes: String,
  },
  { _id: true }
);

const paymentSchema = new mongoose.Schema(
  {
    guestId: String,
    name: String,
    amount: Number,
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    payMethod: String,
    paidAt: Date,
  },
  { _id: false }
);

const tableSessionSchema = new mongoose.Schema(
  {
    tableNo: { type: String, required: true, index: true },
    code: String,
    status: {
      type: String,
      enum: ["open", "ordering", "paying", "closed"],
      default: "open",
    },
    guests: [guestSchema],
    items: [itemSchema],
    payments: [paymentSchema],
    splitMode: { type: String, default: "equal" },
    serviceChargePercent: { type: Number, default: 12 },
    discount: { type: Number, default: 0 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    closedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.TableSession || mongoose.model("TableSession", tableSessionSchema);
