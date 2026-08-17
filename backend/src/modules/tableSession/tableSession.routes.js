import express from "express";
import {
  listOpenSessions,
  openOrGetSession,
  joinSession,
  addItemToSession,
  removeItem,
  submitSessionOrder,
  setupSplit,
  markGuestPaid,
  getSession,
} from "./tableSession.controller.js";
import { protect } from "../../middleware/auth.js";

const router = express.Router();
router.get("/", protect, listOpenSessions);
router.get("/:tableNo", getSession);
router.post("/:tableNo/open", openOrGetSession);
router.post("/:tableNo/join", joinSession);
router.post("/:tableNo/items", addItemToSession);
router.delete("/:tableNo/items/:itemId", removeItem);
router.post("/:tableNo/submit", submitSessionOrder);
router.post("/:tableNo/split", setupSplit);
router.post("/:tableNo/pay-share", markGuestPaid);
export default router;
