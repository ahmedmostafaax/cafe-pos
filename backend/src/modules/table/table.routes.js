import express from "express";
import {
  getAllTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
} from "./table.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

router
  .route("/")
  .get(getAllTables)
  .post(protect, restrictTo("admin"), createTable);

router
  .route("/:id")
  .get(getTable)
  .patch(protect, restrictTo("admin"), updateTable)
  .delete(protect, restrictTo("admin"), deleteTable);

export default router;
