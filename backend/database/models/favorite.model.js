import mongoose from "mongoose";
const favoriteSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
  },
  { timestamps: true }
);
favoriteSchema.index({ customer: 1, menuItem: 1 }, { unique: true });
export default mongoose.model("Favorite", favoriteSchema);
