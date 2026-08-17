import express from "express";
import { getCurrent, openSession, closeSession, lastClosed } from "./cash.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();
router.use(protect);
router.get("/current", getCurrent);
router.get("/last", restrictTo("admin", "front"), lastClosed);
router.post("/open", restrictTo("admin", "front"), openSession);
router.post("/close", restrictTo("admin", "front"), closeSession);
export default router;
