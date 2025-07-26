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

// Send Gupshup Template Message (Re-usable function)
async function sendGupshupMessage(destination) {
  const params = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination: destination,
    'src.name': 'ApnaSchemeTechnologies',
    message: JSON.stringify({
      type: 'template',
      template: {
        name: 'welcome_user',
        languageCode: 'en',
        components: [
          {
            type: 'button',
            subType: 'quickReply',
            index: 0,
            parameters: [{ type: 'payload', payload: 'हिंदी' }]
          },
          {
            type: 'button',
            subType: 'quickReply',
            index: 1,
            parameters: [{ type: 'payload', payload: 'English' }]
          },
          {
            type: 'button',
            subType: 'quickReply',
            index: 2,
            parameters: [{ type: 'payload', payload: 'मराठी' }]
          }
        ]
      }
    })
  });

  try {
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
    console.log('✅ Gupshup response:', response.data);
  } catch (error) {
    console.error('❌ Error sending template message:', error.response?.data || error.message);
  }
}

// Webhook to receive messages from Gupshup
app.post('/gupshup', async (req, res) => {
  const payload = req.body.payload;

  if (!payload || !payload.source || !payload.payload?.text) {
    console.error('❌ Invalid webhook payload.');
    return res.sendStatus(400);
  }

  const sender = payload.source;
  const message = payload.payload.text.toLowerCase();

  // Trigger response when user says "hi"
  if (message === 'hi') {
    await sendGupshupMessage(sender);
  }

  // Always respond 200 OK to Gupshup
  res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 ApnaScheme bot server running on port ${PORT}`);
});
