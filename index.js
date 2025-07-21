import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

app.post('/gupshup', async (req, res) => {
  const incoming = req.body;

  // Gupshup sends messages under this structure
  if (
    incoming.type === 'message' &&
    incoming.payload &&
    incoming.payload.payload &&
    incoming.payload.payload.text
  ) {
    const userMsg = incoming.payload.payload.text.trim().toLowerCase();
    const userNumber = incoming.payload.sender.phone;

    if (userMsg === 'Hi') {
      await sendTextMessage(userNumber, 'Namaste! Welcome to ApnaScheme – aapka digital dost 🇮🇳');
    }
  }

  res.sendStatus(200);
});

async function sendTextMessage(phoneNumber, message) {
  const url = 'https://api.gupshup.io/sm/api/v1/msg';

  try {
    await axios.post(
      url,
      new URLSearchParams({
        channel: 'whatsapp',
        source: process.env.SOURCE_PHONE, // your Gupshup registered number
        destination: phoneNumber,
        message: message,
        src.name: process.env.BOT_NAME,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': process.env.GUPSHUP_API_KEY,
        },
      }
    );
    console.log(`✅ Sent message to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
  }
}

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
