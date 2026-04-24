require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Order");

async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    const result = await Order.deleteMany({});

    console.log(`🗑 Deleted ${result.deletedCount} records from orders collection`);

    await mongoose.disconnect();
    console.log("✅ Done");
    process.exit(0);
  } catch (err) {
    console.log("❌ Error:", err.message);
    process.exit(1);
  }
}

clearDB();