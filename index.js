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
    try {
      // Prepare template message according to Gupshup's API spec
      const response = await axios.post(
        'https://api.gupshup.io/wa/api/v1/template/msg',
        new URLSearchParams({
          channel: 'whatsapp',
          source: process.env.GUPSHUP_PHONE_NUMBER,
          destination: sender,
          'src.name': 'ApnaSchemeTechnologies',
          template: JSON.stringify({
            id: 'welcome_user', // Use 'id' instead of 'name'

          }),
          // Optional: Add postback texts for quick reply buttons
          postbackTexts: JSON.stringify([
            {
              index: 0, // Button index (0-based)
              text: "language_selected" // Postback text
            }
          ])
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apikey': process.env.GUPSHUP_APP_TOKEN
          }
        }
      );

      console.log("✅ Template message sent:", response.data);
    } catch (error) {
      console.error("❌ Error sending template:", {
        status: error.response?.status,
        error: error.response?.data || error.message,
        config: {
          url: error.config?.url,
          data: error.config?.data
        }
      });
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Using Gupshup API endpoint: https://api.gupshup.io/wa/api/v1/template/msg`);
});
