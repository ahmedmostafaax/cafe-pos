import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    name: String,
    station: {
      type: String,
      enum: ["kitchen", "bar"],
      default: "kitchen",
    },
    price: Number,
    qty: {
      type: Number,
      default: 1,
      min: 1,
    },
    options: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    tableId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession",
    },
    guestId: {
      type: String,
      default: "",
    },
    guestName: {
      type: String,
      default: "",
    },
    payShare: {
      type: String,
      enum: ["self", "full_table", "partial"],
      default: "self",
    },
    timeline: [
      {
        step: String,
        label: String,
        at: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    etaMinutes: {
      type: Number,
      default: 15,
    },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ["active", "preparing", "ready", "served", "archived", "cancelled", "unpaid"],
      default: "active",
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    guests: {
      type: Number,
      default: 1,
    },
    dineIn: {
      type: Boolean,
      default: true,
    },
    payMethod: {
      type: String,
      enum: ["", "cashier", "instapay", "wallet", "cash"],
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending_transfer", "paid"],
      default: "unpaid",
    },
    discount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // للعميل يتابع الطلب من غير لوجين
    publicToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    // التقييم
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    ratingComment: {
      type: String,
      default: "",
    },
    ratedAt: Date,
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.orderNumber) {
      const count = await mongoose.model("Order").countDocuments();
      this.orderNumber = `ORD-${String(count + 1).padStart(5, "0")}`;
    }
    if (!this.publicToken) {
      this.publicToken = `T${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
