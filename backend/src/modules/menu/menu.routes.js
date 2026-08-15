import express from "express";
import {
  getAllMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from "./menu.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router
  .route("/")
  .get(getAllMenu)
  .post(protect, restrictTo("admin"), createMenuItem);

router
  .route("/:id")
  .get(getMenuItem)
  .patch(protect, restrictTo("admin"), updateMenuItem)
  .delete(protect, restrictTo("admin"), deleteMenuItem);

router.patch(
  "/:id/toggle",
  protect,
  restrictTo("admin"),
  toggleAvailability
);

export default router;
