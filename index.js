import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Gupshup webhook endpoint
app.post('/gupshup', async (req, res) => {
  const payload = req.body.payload;

  if (!payload || !payload.source || !payload.payload?.text) {
    return res.sendStatus(400);
  }

  const sender = payload.source; // WhatsApp user's phone number
  const message = payload.payload.text?.toLowerCase();

  if (message === 'hi') {
    // Prepare Gupshup template message parameters
    const params = new URLSearchParams({
      channel: 'whatsapp',
      source: process.env.GUPSHUP_PHONE_NUMBER, // Your WhatsApp business number
      destination: sender,
      'src.name': 'ApnaSchemeTechnologies',
      message: JSON.stringify({
        type: 'template',
        template: {
          name: 'welcome_user', // Your pre-approved template name
          languageCode: 'en',
          components: []
        }
      })
    });

    try {
      // Trigger Gupshup outbound API to send WhatsApp message
      const response = await axios.post(
        'https://api.gupshup.io/sm/api/v1/msg',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            apikey: process.env.GUPSHUP_APP_TOKEN
          }
        }
      );
      console.log(✅ Message sent. Gupshup response:, response.data);
    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
    }
  }

  // Always respond 200 OK to webhook
  res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => {
  console.log(✅ Server started on port ${PORT});
});
