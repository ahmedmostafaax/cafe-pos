import express from "express";
import { getAllOffers, createOffer, updateOffer, deleteOffer } from "./offer.controller.js";
import { protect, restrictTo } from "../../middleware/auth.js";

const router = express.Router();
router.get("/", getAllOffers);
router.post("/", protect, restrictTo("admin"), createOffer);
router.patch("/:id", protect, restrictTo("admin"), updateOffer);
router.delete("/:id", protect, restrictTo("admin"), deleteOffer);
export default router;
