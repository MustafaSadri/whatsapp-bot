const twilio = require("twilio");

// ✅ Create client ONLY ONCE (important)
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

async function sendWhatsApp(message) {
  try {
    const numbers = process.env.WHATSAPP_NUMBERS.split(",");

    for (let num of numbers) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: num.trim(),
        body: message
      });

      console.log("✅ Sent to:", num);
    }
  } catch (err) {
    console.log("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}

module.exports = sendWhatsApp;