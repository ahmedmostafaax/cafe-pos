import mongoose from "mongoose";
const comboSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    price: { type: Number, required: true },
    image: String,
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Menu" }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export default mongoose.model("Combo", comboSchema);
