const twilio = require("twilio");

// Create client only once.
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

async function sendWhatsApp(message) {
  const numbers = (process.env.WHATSAPP_NUMBERS || "")
    .split(",")
    .map(num => num.trim())
    .filter(Boolean);

  if (numbers.length === 0) {
    throw new Error("WHATSAPP_NUMBERS is empty. Add numbers like whatsapp:+919999999999");
  }

  const results = [];

  for (const num of numbers) {
    try {
      const sentMessage = await client.messages.create({
        from: "whatsapp:+14155238886",
        to: num,
        body: message
      });

      results.push({
        to: num,
        sid: sentMessage.sid,
        status: sentMessage.status
      });

      console.log("WhatsApp queued:", num, sentMessage.sid);
    } catch (err) {
      const errorMessage = [
        err.code ? `code=${err.code}` : "",
        err.status ? `status=${err.status}` : "",
        err.message || "",
        err.moreInfo ? `moreInfo=${err.moreInfo}` : ""
      ].filter(Boolean).join(" | ");

      results.push({
        to: num,
        code: err.code,
        status: err.status,
        moreInfo: err.moreInfo,
        error: errorMessage
      });

      console.log("WhatsApp Error:", num, errorMessage);
    }
  }

  const successfulMessages = results.filter(result => result.sid);

  if (successfulMessages.length === 0) {
    throw new Error(
      results.map(result => `${result.to}: ${result.error}`).join("; ")
    );
  }

  return results;
}

module.exports = sendWhatsApp;
