const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    painting: { type: mongoose.Schema.Types.ObjectId, ref: "Painting", required: true },
    price: { type: Number, required: true }, // price at the time of purchase
    status: { type: String, enum: ["placed", "cancelled"], default: "placed" },
  },
  { timestamps: true }
);

// Safety net: only ONE "placed" order can exist per painting.
// Cancelled orders are ignored, so a painting can be bought again after a cancel.
orderSchema.index(
  { painting: 1 },
  { unique: true, partialFilterExpression: { status: "placed" } }
);

module.exports = mongoose.model("Order", orderSchema);
