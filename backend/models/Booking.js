const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    wallSize: { type: Number, required: true }, // square feet
    address: { type: String, required: true, trim: true },
    price: { type: Number, required: true }, // wallSize x rate from the seed data
    status: {
      type: String,
      enum: ["requested", "confirmed", "declined", "cancelled"],
      default: "requested",
    },
    // true while the booking holds its date (requested or confirmed).
    // false once it is declined or cancelled, which frees the date.
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Safety net: the database refuses a second ACTIVE booking for the same date.
bookingSchema.index(
  { date: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

module.exports = mongoose.model("Booking", bookingSchema);
