const mongoose = require("mongoose");

const potteryItemSchema = new mongoose.Schema({
  seedId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

module.exports = mongoose.model("PotteryItem", potteryItemSchema);
