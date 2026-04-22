require("dotenv").config();

// ✅ Fix listener warning
require("events").EventEmitter.defaultMaxListeners = 50;

const axios = require("axios");
const mongoose = require("mongoose");
const cron = require("node-cron");

const Order = require("./models/Order");
const sendWhatsApp = require("./services/whatsapp");

const TOKEN = process.env.TOKEN;

// ✅ MongoDB connect
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("✅ MongoDB Connected");

})
.catch(err => console.log(err));


// 🔥 CRON JOB (every 2 minutes for testing)
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Checking orders...");

  try {
    const res = await axios.get(
      "https://api.moysklad.ru/api/remap/1.2/entity/customerorder",
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        params: {
          filter: "state.name=NEW;state.name=ACCEPTED", // 🔥 ONLY REQUIRED ORDERS
          limit: 20,
          expand: "agent,state"
        }
      }
    );

    let orders = res.data.rows;

    // ✅ SORT BY CREATED DATE (latest first)
    orders.sort((a, b) => new Date(b.moment) - new Date(a.moment));

    for (let order of orders) {

      console.log("🔍 Checking:", order.name, order.state?.name);

      const existing = await Order.findOne({ orderId: order.id });
      const status = order.state?.name;

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

      // 🆕 NEW ORDER OR ACCEPTED
      if (!existing && (status === "NEW" || status === "ACCEPTED")) {

        await Order.create({
          orderId: order.id,
          status
        });

        await sendWhatsApp(
`🆕 New Order

📦 Order: ${order.name}
📍 Address: ${order.shipmentAddress || "No address"}
📦 Qty: ${totalQty} pcs
📌 Status: ${status}

🔗 View Orders:
https://sales-dashboard-o6n6.onrender.com/`
        );
      }

      // 🔄 STATUS CHANGE → ACCEPTED
      else if (existing && existing.status !== status && status === "ACCEPTED") {

        existing.status = status;
        await existing.save();

        await sendWhatsApp(
`✅ Order Accepted

📦 Order: ${order.name}
📍 Address: ${order.shipmentAddress || "No address"}
📦 Qty: ${totalQty} pcs`
        );
      }
    }

  } catch (err) {
    console.log("❌ Error:", err.response?.data || err.message);
  }
});

console.log("🚀 WhatsApp Bot Running...");