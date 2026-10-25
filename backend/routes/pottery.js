const express = require("express");
const mongoose = require("mongoose");
const PotteryRequest = require("../models/PotteryRequest");
const PotteryItem = require("../models/PotteryItem");
const Glaze = require("../models/Glaze");
const { daysFromToday } = require("../utils/dates");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/pottery/options -> items and glazes from the seed data (for the form dropdowns)
router.get("/options", requireAuth, async (req, res, next) => {
  try {
    const items = await PotteryItem.find().sort({ seedId: 1 });
    const glazes = await Glaze.find().sort({ seedId: 1 });
    res.json({ items, glazes });
  } catch (err) {
    next(err);
  }
});

// Checks the form fields. Returns { error } or { value } (the cleaned data).
async function validateRequest(body) {
  const { itemId, glazeId, quantity, neededBy } = body;

  if (!mongoose.isValidObjectId(itemId) || !(await PotteryItem.exists({ _id: itemId }))) {
    return { error: "Please choose a valid pottery item" };
  }
  if (!mongoose.isValidObjectId(glazeId) || !(await Glaze.exists({ _id: glazeId }))) {
    return { error: "Please choose a valid glaze" };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 12) {
    return { error: "Quantity must be a whole number from 1 to 12" };
  }
  const days = daysFromToday(neededBy);
  if (days === null) return { error: "Please choose a valid needed-by date" };
  if (days < 14) return { error: "The needed-by date must be at least 14 days from today" };

  return { value: { item: itemId, glaze: glazeId, quantity, neededBy } };
}

function withNames(query) {
  return query
    .populate("item", "name")
    .populate("glaze", "name")
    .populate("customer", "name email");
}

// POST /api/pottery -> customer only
router.post("/", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { error, value } = await validateRequest(req.body);
    if (error) return res.status(400).json({ message: error });

    const created = await PotteryRequest.create({ ...value, customer: req.user._id });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /api/pottery -> customer sees only their own, studio sees all
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "studio" ? {} : { customer: req.user._id };
    const list = await withNames(PotteryRequest.find(filter).sort({ createdAt: -1 }));
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/pottery/:id -> someone else's request gives 404
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const filter = { _id: req.params.id };
    if (req.user.role !== "studio") filter.customer = req.user._id;

    const found = await withNames(PotteryRequest.findOne(filter));
    if (!found) return res.status(404).json({ message: "Request not found" });
    res.json(found);
  } catch (err) {
    next(err);
  }
});

// PUT /api/pottery/:id -> customer edits own request, only while "requested"
router.put("/:id", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const { error, value } = await validateRequest(req.body);
    if (error) return res.status(400).json({ message: error });

    const updated = await PotteryRequest.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: "requested" },
      value,
      { new: true }
    );
    if (updated) return res.json(updated);

    const mine = await PotteryRequest.exists({ _id: req.params.id, customer: req.user._id });
    if (!mine) return res.status(404).json({ message: "Request not found" });
    return res.status(409).json({ message: "Only requests that are still 'requested' can be edited" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pottery/:id/cancel -> customer cancels own request, only while "requested"
router.patch("/:id/cancel", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const updated = await PotteryRequest.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: "requested" },
      { status: "cancelled" },
      { new: true }
    );
    if (updated) return res.json(updated);

    const mine = await PotteryRequest.exists({ _id: req.params.id, customer: req.user._id });
    if (!mine) return res.status(404).json({ message: "Request not found" });
    return res.status(409).json({ message: "Only requests that are still 'requested' can be cancelled" });
  } catch (err) {
    next(err);
  }
});

// Studio decision: accept or decline, only while "requested"
function decide(newStatus) {
  return async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ message: "Request not found" });
      }
      const updated = await PotteryRequest.findOneAndUpdate(
        { _id: req.params.id, status: "requested" },
        { status: newStatus },
        { new: true }
      );
      if (updated) return res.json(updated);

      const exists = await PotteryRequest.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: "Request not found" });
      return res.status(409).json({ message: "Only requests that are still 'requested' can be accepted or declined" });
    } catch (err) {
      next(err);
    }
  };
}

router.patch("/:id/accept", requireAuth, requireRole("studio"), decide("accepted"));
router.patch("/:id/decline", requireAuth, requireRole("studio"), decide("declined"));

module.exports = router;
