import express from "express";
import {
  getAllUsers,
  getUserStats,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "./user.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/stats", getUserStats);

router.route("/").get(getAllUsers).post(createUser);

router
  .route("/:id")
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

router.patch("/:id/toggle", toggleUserStatus);

export default router;
