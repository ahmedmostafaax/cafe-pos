import express from "express";
import {
  getAllOrders,
  getActiveOrders,
  getOrder,
  getOrderByToken,
  createOrder,
  createPublicOrder,
  updateOrder,
  updateOrderStatus,
  confirmPayment,
  markTransferPending,
  processGatewayPayment,
  rateOrder,
  deleteOrder,
} from "./order.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();

// Public (للعميل)
router.post("/public", createPublicOrder);
router.get("/track/:token", getOrderByToken);
router.patch("/track/:token/transfer", markTransferPending);
router.post("/track/:token/pay-gateway", processGatewayPayment);
router.post("/pay-gateway", processGatewayPayment);
router.post("/track/:token/rate", rateOrder);

// Protected
router.get("/active", protect, getActiveOrders);

router
  .route("/")
  .get(protect, getAllOrders)
  .post(protect, createOrder);

router
  .route("/:id")
  .get(protect, getOrder)
  .patch(protect, updateOrder)
  .delete(protect, restrictTo("admin"), deleteOrder);

router.patch("/:id/status", protect, updateOrderStatus);
router.patch("/:id/pay", protect, confirmPayment);
router.post("/:id/pay-gateway", protect, processGatewayPayment);

export default router;
