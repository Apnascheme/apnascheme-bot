import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Gupshup credentials
const GUPSHUP_API_URL = 'https://api.gupshup.io/sm/api/v1/msg';
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const BOT_PHONE = process.env.BOT_PHONE || '91xxxxxx'; // your WhatsApp bot phone

// When user says "hi", respond
app.post('/gupshup', async (req, res) => {
  const incoming = req.body;

  const message = incoming.message?.text?.toLowerCase();
  const sender = incoming.sender?.phone;

  if (!sender || !message) {
    return res.sendStatus(200);
  }

  if (message === 'hi') {
    try {
      // First, try sending a template message
      const templateResponse = await axios.post(GUPSHUP_API_URL, null, {
        params: {
          channel: 'whatsapp',
          source: BOT_PHONE,
          destination: sender,
          src.name: process.env.GUPSHUP_BOTNAME,
          message: JSON.stringify({
            type: 'template',
            template: {
              name: 'welcome_user', // your approved template
              languageCode: 'en'
            }
          })
        },
        headers: {
          'apikey': GUPSHUP_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // If template is sent successfully, done
      if (templateResponse.data.status === 'submitted') {
        console.log('Template sent');
        return res.sendStatus(200);
      } else {
        // If template failed, fallback to normal text
        console.warn('Template failed, falling back to normal text');
        await sendTextFallback(sender, "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –\nbina agent, bina form, bina confusion.");
        return res.sendStatus(200);
      }
    } catch (error) {
      console.error('Template error, sending fallback:', error.message);
      await sendTextFallback(sender, "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳\nMain aapko batata hoon kaunsi Sarkari Yojana aapke liye hai –\nbina agent, bina form, bina confusion.");
      return res.sendStatus(200);
    }
  }

  res.sendStatus(200);
});

// Fallback: send normal text
async function sendTextFallback(to, text) {
  try {
    await axios.post(GUPSHUP_API_URL, null, {
      params: {
        channel: 'whatsapp',
        source: BOT_PHONE,
        destination: to,
        message: text,
        'src.name': process.env.GUPSHUP_BOTNAME
      },
      headers: {
        apikey: GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Fallback text sent to', to);
  } catch (err) {
    console.error('Fallback failed:', err.message);
  }
}

app.get('/', (req, res) => {
  res.send('ApnaScheme Bot is live 🚀');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
