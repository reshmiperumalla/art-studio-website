const dns = require("dns");
const mongoose = require("mongoose");

// Some networks block the DNS lookup MongoDB Atlas needs.
// This makes Node use Google's public DNS servers instead.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
}

module.exports = connectDB;
