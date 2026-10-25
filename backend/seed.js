require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./db");

const User = require("./models/User");
const Painting = require("./models/Painting");
const PotteryItem = require("./models/PotteryItem");
const Glaze = require("./models/Glaze");
const Setting = require("./models/Setting");

const data = require("./seedData/seed.json");

async function seed() {
  await connectDB();

  // Paintings: insert only if this seedId doesn't exist yet.
  // $setOnInsert means re-running the script never overwrites existing data
  // (for example, a painting that was sold after seeding stays sold).
  for (const p of data.paintings) {
    await Painting.updateOne(
      { seedId: p.id },
      {
        $setOnInsert: {
          title: p.title,
          artist: p.artist,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          status: p.status,
        },
      },
      { upsert: true }
    );
  }

  for (const item of data.potteryItems) {
    await PotteryItem.updateOne(
      { seedId: item.id },
      { $setOnInsert: { name: item.name } },
      { upsert: true }
    );
  }

  for (const g of data.glazes) {
    await Glaze.updateOne(
      { seedId: g.id },
      { $setOnInsert: { name: g.name } },
      { upsert: true }
    );
  }

  await Setting.updateOne(
    { key: "muralRatePerSqFt" },
    { $setOnInsert: { value: data.mural.ratePerSqFt } },
    { upsert: true }
  );

  // Studio (admin) account from the seed file, with a hashed password
  const studio = data.studioAccount;
  const existing = await User.findOne({ email: studio.email.toLowerCase() });
  if (!existing) {
    const passwordHash = await bcrypt.hash(studio.password, 10);
    await User.create({
      name: "Studio Admin",
      email: studio.email,
      passwordHash,
      role: studio.role,
    });
  }

  console.log("Seed complete:");
  console.log("  paintings:", await Painting.countDocuments());
  console.log("  pottery items:", await PotteryItem.countDocuments());
  console.log("  glazes:", await Glaze.countDocuments());
  console.log("  users:", await User.countDocuments());

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
