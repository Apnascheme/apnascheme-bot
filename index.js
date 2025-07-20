require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// For Gupshup webhook verification (GET)
app.get('/gupshup', (req, res) => {
  res.sendStatus(200);
});

// POST webhook for incoming messages
app.post('/gupshup', async (req, res) => {
  const { type, payload } = req.body;

  console.log('📩 Incoming:', JSON.stringify(req.body, null, 2));

  // Check if message is valid
  if (type === 'user-event' && payload?.type === 'message') {
    const phone = payload.sender?.phone;
    const msgText = payload.payload?.text?.toLowerCase();

    if (msgText === 'hi') {
      try {
        await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
          params: {
            channel: 'whatsapp',
            source: process.env.GUPSHUP_PHONE_NUMBER,
            destination: phone,
            message: JSON.stringify({
              type: 'template',
              template: {
                namespace: '9a699086-7c8a-4849-a105-42627f4e882f',
                name: 'language_selection_v1',
                language: {
                  code: 'en'
                }
              }
            }),
            'src.name': 'ApnaScheme',
          },
          headers: {
            apikey: process.env.GUPSHUP_APP_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        console.log('✅ Reply sent to:', phone);
      } catch (err) {
        console.error('❌ Error sending reply:', err.response?.data || err.message);
      }
    }
  }

  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(🚀 ApnaScheme bot server started on port ${PORT});
});