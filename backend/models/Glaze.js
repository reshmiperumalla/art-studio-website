const mongoose = require("mongoose");

const glazeSchema = new mongoose.Schema({
  seedId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

module.exports = mongoose.model("Glaze", glazeSchema);
