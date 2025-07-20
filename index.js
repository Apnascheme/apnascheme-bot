import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running');
});

// Webhook to receive messages
app.post('/gupshup', async (req, res) => {
  const incoming = req.body;

  try {
    const message = incoming.payload?.payload?.text?.toLowerCase();
    const sender = incoming.payload?.sender?.phone;
    console.log('Incoming message from ${sender} : ${message}');

    if (message === 'hi') {
      const response = await axios.post(
        'https://api.gupshup.io/sm/api/v1/msg',
        null,
        {
          params: {
            channel: 'whatsapp',
            source: process.env.GUPSHUP_PHONE_NUMBER,
            destination: sender,
            'src.name': 'ApnaSchemeBot',
            template: 'language_selection_v1',
            templateParams: '[]',
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            apikey: process.env.GUPSHUP_APP_TOKEN,
          },
        }
      );

      console.log('Reply sent to user');
      return res.sendStatus(200);
    } else {
      console.log('Message did not match "hi"');
      return res.sendStatus(200);
    }
  } catch (error) {
    console.error('Error sending message:', error.message);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log('ApnaScheme bot server started on port ${PORT}');
});
