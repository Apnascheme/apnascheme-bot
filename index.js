import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  const sender = payload?.payload?.source;
  const message = payload?.payload?.payload?.text;

  console.log(`Incoming message from ${sender} : ${message}`);

  if (message && message.toLowerCase() === 'hi') {
    const msgParams = {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER,
      destination: sender,
      'src.name': 'ApnaSchemeTechnologies',
      template: 'language_selection_v1',
      templateParams: '[]'
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: process.env.GUPSHUP_APP_TOKEN
    };

    // Log the parameters for debugging
    console.log("🔥 Sending message with params:");
    console.log(msgParams);
    console.log("🧾 Headers:");
    console.log(headers);

    try {
      const response = await axios.post(
        'https://api.gupshup.io/sm/api/v1/msg',
        new URLSearchParams(msgParams).toString(),
        { headers }
      );

      console.log(✅` Message sent. Gupshup response: ${response.status}`);
    } catch (error) {
      console.error(❌ Error sending message: ${error.response?.data || error.message});
    }
  }

  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(\n✅` ApnaScheme bot server started on port ${PORT}`);
  console.log(==> Available at your primary URL https://apnascheme-bot.onrender.com);
  console.log('///////////////////////////////////////////////////////////\n');
});
