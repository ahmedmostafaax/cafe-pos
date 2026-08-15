import express from "express";
import {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router
  .route("/")
  .get(getAllCategories)
  .post(protect, restrictTo("admin"), createCategory);

router
  .route("/:id")
  .get(getCategory)
  .patch(protect, restrictTo("admin"), updateCategory)
  .delete(protect, restrictTo("admin"), deleteCategory);

export default router;
