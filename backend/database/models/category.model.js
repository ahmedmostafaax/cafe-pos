import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم التصنيف مطلوب"],
      unique: true,
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
    sort: {
      type: Number,
      default: 0,
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

const Category = mongoose.model("Category", categorySchema);
export default Category;
