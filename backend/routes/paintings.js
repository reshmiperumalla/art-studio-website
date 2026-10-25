const express = require("express");
const mongoose = require("mongoose");
const Painting = require("../models/Painting");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Checks the fields the studio sends when adding or editing a painting.
// Returns an error message, or null if everything is fine.
function validatePainting(body) {
  const { title, artist, price } = body;
  if (!title || !String(title).trim()) return "Title is required";
  if (!artist || !String(artist).trim()) return "Artist is required";
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return "Price must be a number greater than 0";
  }
  return null;
}

// GET /api/paintings  -> any logged-in user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const paintings = await Painting.find().sort({ createdAt: 1, _id: 1 });
    res.json(paintings);
  } catch (err) {
    next(err);
  }
});

// GET /api/paintings/:id  -> any logged-in user
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Painting not found" });
    }
    const painting = await Painting.findById(req.params.id);
    if (!painting) return res.status(404).json({ message: "Painting not found" });
    res.json(painting);
  } catch (err) {
    next(err);
  }
});

// POST /api/paintings  -> studio only
router.post("/", requireAuth, requireRole("studio"), async (req, res, next) => {
  try {
    const error = validatePainting(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, artist, description, price, imageUrl } = req.body;
    const painting = await Painting.create({
      title: String(title).trim(),
      artist: String(artist).trim(),
      description: description ? String(description) : "",
      price,
      imageUrl: imageUrl ? String(imageUrl) : "",
      status: "available", // new paintings always start available
    });
    res.status(201).json(painting);
  } catch (err) {
    next(err);
  }
});

// PUT /api/paintings/:id  -> studio only, and only while the painting is available
router.put("/:id", requireAuth, requireRole("studio"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Painting not found" });
    }

    const error = validatePainting(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, artist, description, price, imageUrl } = req.body;

    // The status check is part of the update itself, so a painting that was
    // sold a moment ago cannot be edited.
    const updated = await Painting.findOneAndUpdate(
      { _id: req.params.id, status: "available" },
      {
        title: String(title).trim(),
        artist: String(artist).trim(),
        description: description ? String(description) : "",
        price,
        imageUrl: imageUrl ? String(imageUrl) : "",
      },
      { new: true }
    );

    if (updated) return res.json(updated);

    // Nothing updated: either it doesn't exist, or it is sold
    const exists = await Painting.exists({ _id: req.params.id });
    if (!exists) return res.status(404).json({ message: "Painting not found" });
    return res.status(409).json({ message: "Sold paintings cannot be edited" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
