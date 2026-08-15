import express from "express";
import { login, getMe, createAdmin } from "./auth.controller.js";
import { protect } from "../../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/create-admin", createAdmin); // مرة واحدة فقط
router.get("/me", protect, getMe);

export default router;
