import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/', async (req, res) => {
  const incoming = req.body;
  console.log('Full incoming payload:', JSON.stringify(incoming, null, 2));

  const message = incoming.payload?.payload?.text?.toLowerCase();
  const userPhone = incoming.payload?.sender?.phone;

  if (message === 'Hi') {
    const replyText = `Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –\nbina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:\n🔘 हिंदी 🔘 English 🔘 मराठी`;

    try {
      await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
        params: {
          channel: 'whatsapp',
          source: process.env.GUPSHUP_PHONE, 
          destination: userPhone,
          message: replyText,
          'src.name': process.env.GUPSHUP_BOTNAME
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': process.env.GUPSHUP_API_KEY,
        },
      });

      res.sendStatus(200); // Acknowledge webhook
    } catch (error) {
      console.error('Error sending message to Gupshup:', error.response?.data || error.message);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200); // No-op for other messages for now
  }
});

app.get('/', (req, res) => {
  res.send('ApnaScheme bot is running 🚀');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
