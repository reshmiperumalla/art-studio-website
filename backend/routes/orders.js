const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Painting = require("../models/Painting");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/orders  { paintingId }  -> customer only
router.post("/", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { paintingId } = req.body;
    if (!mongoose.isValidObjectId(paintingId)) {
      return res.status(400).json({ message: "A valid paintingId is required" });
    }

    // THE KEY LINE: one atomic step. "Make it sold, but only if it is still available."
    // If two customers click at the same moment, only one of them gets a painting back.
    const painting = await Painting.findOneAndUpdate(
      { _id: paintingId, status: "available" },
      { status: "sold" },
      { new: true }
    );

    if (!painting) {
      const exists = await Painting.exists({ _id: paintingId });
      if (!exists) return res.status(404).json({ message: "Painting not found" });
      return res.status(409).json({ message: "Sorry, this painting has already been sold" });
    }

    let order;
    try {
      order = await Order.create({
        customer: req.user._id,
        painting: painting._id,
        price: painting.price,
      });
    } catch (err) {
      // If saving the order failed, put the painting back so it is not stuck as sold
      await Painting.updateOne({ _id: painting._id }, { status: "available" });
      throw err;
    }

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders -> customer sees only their own, studio sees all
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "studio" ? {} : { customer: req.user._id };
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("painting", "title artist imageUrl")
      .populate("customer", "name email");
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id -> a customer asking for someone else's order gets 404
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Order not found" });
    }
    const filter = { _id: req.params.id };
    if (req.user.role !== "studio") filter.customer = req.user._id;

    const order = await Order.findOne(filter)
      .populate("painting", "title artist imageUrl")
      .populate("customer", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/cancel -> customer only, own orders only
router.patch("/:id/cancel", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Atomic: cancel only if it is mine AND still "placed"
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: "placed" },
      { status: "cancelled" },
      { new: true }
    );

    if (!order) {
      const mine = await Order.exists({ _id: req.params.id, customer: req.user._id });
      if (!mine) return res.status(404).json({ message: "Order not found" });
      return res.status(409).json({ message: "This order is already cancelled" });
    }

    // The painting becomes available again
    await Painting.updateOne({ _id: order.painting }, { status: "available" });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
