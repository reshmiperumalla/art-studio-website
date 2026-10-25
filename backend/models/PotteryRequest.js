const mongoose = require("mongoose");

const potteryRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "PotteryItem", required: true },
    glaze: { type: mongoose.Schema.Types.ObjectId, ref: "Glaze", required: true },
    quantity: { type: Number, required: true }, // 1 to 12
    neededBy: { type: String, required: true }, // "YYYY-MM-DD", at least 14 days away
    status: {
      type: String,
      enum: ["requested", "accepted", "declined", "cancelled"],
      default: "requested",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PotteryRequest", potteryRequestSchema);
