import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());

const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  apikey: process.env.GUPSHUP_APP_TOKEN, // set in your .env
};

app.post('/gupshup', async (req, res) => {
  try {
    const body = req.body;
    const sender = body?.payload?.source; // phone number of sender
    const messageText = body?.payload?.payload?.text;

    if (messageText?.toLowerCase() === 'hi') {
      // 👇 Correct template object (not string)
      const templateMessage = {
        type: 'template',
        template: {
          name: 'welcome_user',
          languageCode: 'en',
          components: []
        }
      };

      const formBody = new URLSearchParams({
        channel: 'whatsapp',
        source: process.env.GUPSHUP_PHONE_NUMBER, // your bot number
        destination: sender,
        'src.name': 'ApnaSchemeTechnologies',
        message: JSON.stringify(templateMessage) // ✅ stringify only here
      }).toString();

      const response = await axios.post(
        'https://api.gupshup.io/sm/api/v1/msg',
        formBody,
        { headers }
      );

      console.log('Template sent:', response.data);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error sending template:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`ApnaScheme bot server running on port ${PORT}`);
});
