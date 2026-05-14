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
const MOYSKLAD_ORDER_URL = "https://api.moysklad.ru/api/remap/1.2/entity/customerorder";

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("DB Error:", err));

function buildOrderMessage(orderDoc) {
  return `Order Received

Order No: ${orderDoc.orderNo}
Customer: ${orderDoc.customerName}
Phone: ${orderDoc.customerPhone || "No phone"}
Address: ${orderDoc.address}
Qty: ${orderDoc.quantity} pcs

View Orders:
https://sales-dashboard-o6n6.onrender.com/`;
}

async function fetchOrderQuantity(orderId) {
  const posRes = await axios.get(
    `${MOYSKLAD_ORDER_URL}/${orderId}/positions`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    }
  );

  return (posRes.data.rows || []).reduce((total, item) => {
    return total + Number(item.quantity || 0);
  }, 0);
}

async function notifyOrder(orderDoc) {
  try {
    const results = await sendWhatsApp(orderDoc);
    const firstSuccessfulMessage = results.find(result => result.sid);

    orderDoc.whatsappStatus = "sent";
    orderDoc.whatsappSentAt = new Date();
    orderDoc.whatsappError = "";
    orderDoc.whatsappMessageSid = firstSuccessfulMessage?.sid || "";
    await orderDoc.save();

    console.log("WhatsApp notification sent for order:", orderDoc.orderNo);
  } catch (err) {
    orderDoc.whatsappStatus = "failed";
    orderDoc.whatsappError = err.message;
    await orderDoc.save();

    console.log("WhatsApp notification failed for order:", orderDoc.orderNo, err.message);
  }
}

async function saveOrUpdateOrder(order, totalQuantity) {
  const orderNo = order.name || "";
  const customerName = order.agent?.name || "No Name";
  const customerPhone = order.agent?.phone || "";

  return Order.findOneAndUpdate(
    { orderId: order.id },
    {
      $set: {
        orderNo,
        orderName: orderNo,
        status: order.state?.name || "NEW",
        customerName,
        customerPhone,
        address: order.shipmentAddress || "No address",
        quantity: totalQuantity,
        qty: totalQuantity,
        moment: order.moment
      },
      $setOnInsert: {
        whatsappStatus: "pending"
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
}

async function fetchOrders(stateName) {
  const res = await axios.get(MOYSKLAD_ORDER_URL, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    params: {
      filter: `state.name=${stateName}`,
      limit: 50,
      order: "moment,desc",
      expand: "agent,state,store"
    }
  });
  return res.data.rows || [];
}

async function checkOrders() {
  console.log("Checking orders...");

  try {
    const [newOrders, acceptedOrders] = await Promise.all([
      fetchOrders("NEW"),
      fetchOrders("ACCEPTED")
    ]);

    const seen = new Set();
    const orders = [...newOrders, ...acceptedOrders].filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    orders.sort((a, b) => new Date(b.moment) - new Date(a.moment));

    for (const order of orders) {
      const storeName = order.store?.name || "";
      console.log("Checking:", order.name, order.state?.name, "| Store:", storeName);

      if (storeName !== "yuzhnie Varota") {
        continue;
      }

      const totalQuantity = await fetchOrderQuantity(order.id);
      const orderDoc = await saveOrUpdateOrder(order, totalQuantity);

      if (orderDoc.whatsappStatus === "sent") {
        continue;
      }

      await notifyOrder(orderDoc);
    }
  } catch (err) {
    console.log("Order check error:", err.response?.data || err.message);
  }
}

cron.schedule("*/2 * * * *", checkOrders);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/twiml/voice", (req, res) => {
  res.type("text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record maxLength="30" playBeep="false"/>
</Response>`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log("WhatsApp Bot Running...");
