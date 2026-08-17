import Inventory from "../../../database/models/inventory.model.js";
import catchAsync from "../../utils/catchAsync.js";
export const list = catchAsync(async (req, res) => {
  const items = await Inventory.find().sort("name");
  res.status(200).json({ status: "success", data: { items, low: items.filter(i => i.qty <= i.minQty) } });
});
export const create = catchAsync(async (req, res) => {
  const item = await Inventory.create(req.body);
  res.status(201).json({ status: "success", data: { item } });
});
export const update = catchAsync(async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.status(200).json({ status: "success", data: { item } });
});
