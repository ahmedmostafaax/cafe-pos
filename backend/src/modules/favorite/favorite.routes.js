import express from "express";
import { list, toggle, protectCustomer } from "./favorite.controller.js";
const router = express.Router();
router.use(protectCustomer);
router.get("/", list);
router.post("/toggle", toggle);
export default router;
