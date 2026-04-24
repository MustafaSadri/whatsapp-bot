require("dotenv").config();

const sendWhatsApp = require("./services/whatsapp");

async function runTest() {
  try {
    console.log("🚀 Sending test WhatsApp notification...");

    await sendWhatsApp(
`🧪 Dummy Test Notification

✅ Your Twilio WhatsApp bot is working correctly.

📦 Order: TEST-001
📍 Address: Demo Address
📦 Qty: 5 pcs

⏰ This is only a test message.`
    );

    console.log("✅ Test message sent successfully.");
    process.exit(0);
  } catch (err) {
    console.log("❌ Test failed:", err.message);
    process.exit(1);
  }
}

runTest();