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
    isActive: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Offer", offerSchema);
