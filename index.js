import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

console.log("GUPSHUP_PHONE_NUMBER:", process.env.GUPSHUP_PHONE_NUMBER);
console.log("GUPSHUP_APP_TOKEN:", process.env.GUPSHUP_APP_TOKEN ? "Loaded" : "Not loaded");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/gupshup', async (req, res) => {
  const body = req.body;
  console.log("Full incoming payload:", JSON.stringify(body, null, 2));

  const payload = body.payload;
  if (!payload || !payload.sender || !payload.payload) {
    console.log("Invalid payload structure.");
    return res.sendStatus(400);
  }

  const phone = payload.sender.phone;
  const text = payload.payload.text;

  console.log("Incoming message from", phone, ":", text);

  const message = text?.trim().toLowerCase();

  if (message === 'Hi') {
    const msgParams = {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER,
      destination: phone,
      'src.name': 'ApnaSchemeTechnologies',
      template: 'welcome_user', // ✅ Use the actual template name you created in Gupshup
      templateParams: JSON.stringify([]) // Pass params if required
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: process.env.GUPSHUP_APP_TOKEN
    };

    console.log("GUPSHUP_APP_TOKEN is:", process.env.GUPSHUP_APP_TOKEN);
    console.log("Sending message with params:", msgParams);

    try {
      const response = await axios.post(
        'https://api.gupshup.io/sm/api/v1/msg',
        new URLSearchParams(msgParams).toString(),
        { headers }
      );
      console.log(`Message sent. Gupshup response: ${response.status}`);
    } catch (error) {
      console.error("Failed to send message:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ ApnaScheme bot server started on port ${PORT}`);
  console.log("🔗 Available at: https://apnascheme-bot.onrender.com");
});
