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

// Reusable send message function
async function sendGupshupMessage(destination, text) {
  const params = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination: destination,
    'src.name': 'ApnaSchemeTechnologies',
    message: JSON.stringify({
      type: 'text',
      text: text
    })
  });

  try {
    await axios.post(
      'https://api.gupshup.io/sm/api/v1/msg',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apikey: process.env.GUPSHUP_APP_TOKEN
        }
      }
    );
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
  }
}

// Gupshup webhook endpoint
app.post('/gupshup', async (req, res) => {
  const body = req.body;
  const payload = body.payload;

  if (!payload || !payload.source || !payload.payload?.text) {
    console.error("❌ Invalid payload structure.");
    return res.sendStatus(400);
  }

  const sender = payload.source;
  const incomingText = payload.payload.text.toLowerCase();

  console.log("Incoming Text:", incomingText);

  if (incomingText === 'hi') {
    await sendGupshupMessage(sender,
      "Namaste! Main hoon ApnaScheme – aapka digital dost 🇮🇳.\n\n" +
      "Main aapko batata hoon kaunsi Sarkari Yojana aapke liye hai – bina agent, bina form, bina confusion.\n\n" +
      "Apni bhaasha chunein:\n1. हिंदी\n2. English\n3. मराठी"
    );
  } else if (incomingText === '1' || incomingText === 'hindi') {
    await sendGupshupMessage(sender, 'Aapne Hindi chuni hai. Aaiye shuru karte hain aapki Yojana jaankari!');
  } else if (incomingText === '2' || incomingText === 'english') {
    await sendGupshupMessage(sender, 'You selected English. Let’s get started with your Yojana check!');
  } else if (incomingText === '3' || incomingText === 'marathi') {
    await sendGupshupMessage(sender, 'आपण मराठी निवडले आहे. चला, तुमच्या योजनेची माहिती घेऊया!');
  } else {
    await sendGupshupMessage(sender, 'Please reply with:\n1 for Hindi\n2 for English\n3 for Marathi');
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});

