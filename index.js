import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Gupshup webhook endpoint
app.post('/gupshup', async (req, res) => {
  const payload = req.body.payload;

  if (!payload || !payload.source || !payload.payload?.text) {
    console.error("❌ Invalid payload structure.");
    return res.sendStatus(400);
  }

  const sender = payload.source;
  const message = payload.payload.text.toLowerCase();

  if (message === 'hi') {
    // Send WhatsApp template using Gupshup outbound API
    const params = new URLSearchParams({
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER,
      destination: sender,
      'src.name': 'ApnaSchemeTechnologies',
      message: JSON.stringify({
        type: 'template',
        template: {
          name: 'welcome_user', // <-- your template name in Gupshup
          languageCode: 'en',
          components: [
            {
              type: "button",
              subType: "quickReply",
              index: 0,
              parameters: [
                { type: "payload", payload: "हिंदी" }
              ]
            },
            {
              type: "button",
              subType: "quickReply",
              index: 1,
              parameters: [
                { type: "payload", payload: "English" }
              ]
            },
            {
              type: "button",
              subType: "quickReply",
              index: 2,
              parameters: [
                { type: "payload", payload: "मराठी" }
              ]
            }
          ]
        }
      })
    });

    try {
      const response = await axios.post( 'https://api.gupshup.io/sm/api/v1/msg',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            apikey: process.env.GUPSHUP_APP_TOKEN
          }
        }
      );
      console.log(' Message sent. Gupshup response:', response.data);
    } catch (error) {
      console.error("❌ Error sending message:", error.response?.data || error.message);
    }
  }

  // Always reply 200 OK to Gupshup webhook
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(' Server started on port ${PORT}');
});
