import mongoose from "mongoose";

const optionChoiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, enum: ["single", "multi"], default: "single" },
    required: { type: Boolean, default: false },
    choices: [optionChoiceSchema],
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
      default: "",
    },
    nameEn: {
      type: String,
      trim: true,
      default: "",
    },
    station: {
      type: String,
      enum: ["kitchen", "bar"],
      default: "kitchen",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: 0,
    },
    desc: {
      type: String,
      default: "",
    },
    descAr: {
      type: String,
      default: "",
    },
    descEn: {
      type: String,
      default: "",
    },
    recipe: {
      type: String,
      default: "",
    },
    available: {
      type: Boolean,
      default: true,
    },
    options: [optionSchema],
    sort: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isSignature: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Menu = mongoose.model("Menu", menuSchema);
export default Menu;
