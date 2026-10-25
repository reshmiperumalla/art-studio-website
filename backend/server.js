require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Painting images: http://localhost:5000/images/p-001.jpg
app.use("/images", express.static(path.join(__dirname, "seedData", "images")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/paintings", require("./routes/paintings"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/pottery", require("./routes/pottery"));

// No route matched
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler: catches errors passed to next(err)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
