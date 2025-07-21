import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is running 🚀');
});

// Webhook endpoint for Gupshup incoming messages
app.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log('Full incoming payload:', JSON.stringify(data, null, 2));

    const userMessage = data.payload?.payload?.text?.toLowerCase();
    const userPhone = data.payload?.sender?.phone;

    if (!userMessage || !userPhone) {
      return res.sendStatus(400);
    }

    console.log(`Incoming message from ${userPhone}: ${userMessage}`);

    // Trigger only on "hi", "hello", "start"
    if (['hi', 'hello', 'start'].includes(userMessage)) {
      const welcomeMessage = {
        type: 'text',
        text: `Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –\nbina agent, bina form, bina confusion.\n\n🗣️ Apni bhaasha chunein:\n🔘 हिंदी 🔘 English 🔘 मराठी`
      };

      const payload = new URLSearchParams();
      payload.append('channel', 'whatsapp');
      payload.append('source', process.env.GUPSHUP_SOURCE_PHONE); // your registered number
      payload.append('destination', userPhone);
      payload.append('src.name', 'ApnaSchemeTechnologies');
      payload.append('message', JSON.stringify(welcomeMessage));

      await axios.post('https://api.gupshup.io/sm/api/v1/msg', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': process.env.GUPSHUP_API_KEY
        }
      });

      console.log(`Reply sent to ${userPhone}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`ApnaScheme bot backend live on port ${PORT}`);
});
