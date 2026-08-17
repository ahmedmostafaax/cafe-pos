import express from "express";
import { createServiceCall, getServiceCalls, updateServiceCall } from "./service-call.controller.js";
import { protect } from "../../middleware/auth.js";
const router = express.Router();
router.post("/", createServiceCall);
router.get("/", protect, getServiceCalls);
router.patch("/:id", protect, updateServiceCall);
export default router;
