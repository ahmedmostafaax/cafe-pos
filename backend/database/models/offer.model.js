import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String, default: "" },
    description: { type: String, default: "" },
    descriptionAr: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    offerType: {
      type: String,
      enum: ["banner", "happy_hour", "combo", "upsell", "rush_hide"],
      default: "banner",
    },
    startHour: { type: Number, min: 0, max: 23, default: 0 },
    endHour: { type: Number, min: 0, max: 23, default: 23 },
    daysOfWeek: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    relatedMenuIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Menu" }],
    comboMenuIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Menu" }],
    hideSlowItemsDuringRush: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Offer", offerSchema);
