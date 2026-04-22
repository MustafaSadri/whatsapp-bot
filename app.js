require("dotenv").config();
require("events").EventEmitter.defaultMaxListeners = 50;

const axios = require("axios");
const mongoose = require("mongoose");
const cron = require("node-cron");
const express = require("express");

const Order = require("./models/Order");
const sendWhatsApp = require("./services/whatsapp");

const app = express();
const TOKEN = process.env.TOKEN;

// ✅ MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Error:", err));


// 🔥 CRON JOB (every 2 minutes)
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Checking orders...");

  try {
    const res = await axios.get(
      "https://api.moysklad.ru/api/remap/1.2/entity/customerorder",
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        params: {
          filter: "state.name=ACCEPTED", // ✅ ONLY ACCEPTED (reduce Twilio usage)
          limit: 20,
          expand: "agent,state"
        }
      }
    );

    let orders = res.data.rows;

    // ✅ Sort latest first
    orders.sort((a, b) => new Date(b.moment) - new Date(a.moment));

    for (let order of orders) {

      console.log("🔍 Checking:", order.name, order.state?.name);

      const existing = await Order.findOne({ orderId: order.id });

      // ❌ Skip if already sent
      if (existing) continue;

      // 🔹 Fetch positions (for quantity)
      const posRes = await axios.get(
        `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${order.id}/positions`,
        {
          headers: { Authorization: `Bearer ${TOKEN}` }
        }
      );

      let totalQty = 0;
      posRes.data.rows.forEach(item => {
        totalQty += item.quantity;
      });

      // 💾 Save to DB (avoid duplicate)
      await Order.create({
        orderId: order.id,
        status: "ACCEPTED"
      });

      // 📩 SEND WHATSAPP
      await sendWhatsApp(
`✅ Order Accepted

📦 Order: ${order.name}
📍 Address: ${order.shipmentAddress || "No address"}
📦 Qty: ${totalQty} pcs

🔗 View Orders:
https://sales-dashboard-o6n6.onrender.com/`
      );
    }

  } catch (err) {
    console.log("❌ Error:", err.response?.data || err.message);
  }
});


// 🌐 EXPRESS SERVER (REQUIRED FOR RENDER)
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running ✅");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

console.log("🚀 WhatsApp Bot Running...");