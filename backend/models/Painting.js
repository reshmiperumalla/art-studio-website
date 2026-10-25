const mongoose = require("mongoose");

const paintingSchema = new mongoose.Schema(
  {
    // id from seed.json (like "p-001"). Paintings added by the studio won't have one.
    seedId: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["available", "sold"], default: "available" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Painting", paintingSchema);
