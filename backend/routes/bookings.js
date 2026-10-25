const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Setting = require("../models/Setting");
const { daysFromToday } = require("../utils/dates");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const OPEN_STATUSES = ["requested", "confirmed"]; // bookings that still hold their date

// GET /api/bookings/rate -> the price per sq ft from the seed data
// (must be defined BEFORE "/:id", otherwise "rate" would be read as an id)
router.get("/rate", requireAuth, async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: "muralRatePerSqFt" });
    if (!setting) {
      return res.status(500).json({ message: "Rate not found. Run: npm run seed" });
    }
    res.json({ ratePerSqFt: setting.value });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings -> customer only
router.post("/", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    const { date, wallSize, address } = req.body;

    // ALL rules are checked here on the server, not only in the browser
    const days = daysFromToday(date);
    if (days === null) {
      return res.status(400).json({ message: "Please choose a valid date" });
    }
    if (days < 7 || days > 90) {
      return res.status(400).json({ message: "The date must be between 7 and 90 days from today" });
    }
    if (typeof wallSize !== "number" || !Number.isFinite(wallSize) || wallSize < 10 || wallSize > 500) {
      return res.status(400).json({ message: "Wall size must be between 10 and 500 sq ft" });
    }
    if (typeof address !== "string" || address.trim().length < 5 || address.trim().length > 300) {
      return res.status(400).json({ message: "Please enter the service address (5 to 300 characters)" });
    }

    const setting = await Setting.findOne({ key: "muralRatePerSqFt" });
    if (!setting) {
      return res.status(500).json({ message: "Rate not found. Run: npm run seed" });
    }

    try {
      const booking = await Booking.create({
        customer: req.user._id,
        date,
        wallSize,
        address: address.trim(),
        price: wallSize * setting.value,
      });
      return res.status(201).json(booking);
    } catch (err) {
      // 11000 = duplicate key: the unique index says this date already has an active booking
      if (err.code === 11000) {
        return res.status(409).json({ message: "Sorry, this date is already booked. Please choose another date." });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings -> customer sees only their own, studio sees all
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "studio" ? {} : { customer: req.user._id };
    const bookings = await Booking.find(filter)
      .sort({ date: 1 })
      .populate("customer", "name email");
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id -> someone else's booking looks like it does not exist (404)
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const filter = { _id: req.params.id };
    if (req.user.role !== "studio") filter.customer = req.user._id;

    const booking = await Booking.findOne(filter).populate("customer", "name email");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel -> customer only, own bookings, until 3 days before the date
router.patch("/:id/cancel", requireAuth, requireRole("customer"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!OPEN_STATUSES.includes(booking.status)) {
      return res.status(409).json({ message: `This booking is already ${booking.status}` });
    }

    const days = daysFromToday(booking.date);
    if (days < 3) {
      return res.status(409).json({ message: "Bookings can only be cancelled until 3 days before the date" });
    }

    // Atomic: cancel only if it is still requested/confirmed. This also frees the date.
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, customer: req.user._id, status: { $in: OPEN_STATUSES } },
      { status: "cancelled", active: false },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: "This booking just changed. Please refresh." });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Studio decision: confirm or decline. Only possible while the booking is "requested".
function decide(newStatus) {
  return async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const updated = await Booking.findOneAndUpdate(
        { _id: req.params.id, status: "requested" },
        // a declined booking frees its date; a confirmed one keeps it
        { status: newStatus, active: newStatus === "confirmed" },
        { new: true }
      );
      if (!updated) {
        const exists = await Booking.exists({ _id: req.params.id });
        if (!exists) return res.status(404).json({ message: "Booking not found" });
        return res.status(409).json({ message: "Only bookings that are still 'requested' can be confirmed or declined" });
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}

router.patch("/:id/confirm", requireAuth, requireRole("studio"), decide("confirmed"));
router.patch("/:id/decline", requireAuth, requireRole("studio"), decide("declined"));

module.exports = router;
