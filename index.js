import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Webhook endpoint for Gupshup
app.post('/gupshup', async (req, res) => {
  console.log("Full incoming payload:", JSON.stringify(req.body, null, 2));

  const payload = req.body.payload;

  // Validate payload structure
  if (!payload || !payload.source || !payload.payload?.text) {
    console.error('Invalid payload structure.');
    return res.sendStatus(400);
  }

  const sender = payload.source;
  const message = payload.payload.text?.toLowerCase();

  console.log('Incoming message from ${sender} : ${message}');

  // Reply to "hi" or "Hi"
 if (message === 'hi') {
  const msgParams = {
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination: sender,
    'src.name': 'ApnaSchemeTechnologies',
    message: JSON.stringify({
      type: 'template',
      template: {
        name: 'welcome_user', // Replace with actual approved template
        languageCode: 'en', // Or 'hi' or 'mr' if you're using Hindi/Marathi templates
        components: [] // Pass parameters here if needed
      }
    })
  };

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    apikey: process.env.GUPSHUP_APP_TOKEN
  };

  try {
    const response = await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      new URLSearchParams(msgParams).toString(),
      { headers }
    );

    console.log(' Message sent. Gupshup response: ${response.status}');
  } catch (error) {
    console.error(' Error sending message:', error.response?.data || error.message);
  }
}

  // Always respond with 200 to Gupshup to avoid retries
  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(' ApnaScheme bot server started on port ${PORT}');
  console.log('Available at:https://apnascheme-bot.onrender.com');
  console.log('///////////////////////////////////////////////////////////\n');
});
