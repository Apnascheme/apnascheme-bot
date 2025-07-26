import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import xlsx from 'xlsx';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

app.use(express.json());
app.get('/', (req, res) => res.send('ApnaScheme Bot is running 🚀'));

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const sender = body.payload?.sender?.phone;
    const incomingMessage = body.payload?.payload?.text?.toLowerCase();

    console.log('Incoming from:', sender, '| Message:', incomingMessage);

    if (!sender) return res.sendStatus(400);

    // On "hi" or first message, trigger welcome template
    if (incomingMessage === 'hi' || incomingMessage === 'hello') {
      await sendGupshupMessage(sender, {
        type: 'template',
        template: {
          name: 'Namaste! I'm ApnaScheme – your digital guide for Government Schemes 🇮🇳

I help you find which Sarkari Yojanas you're eligible for – no agents, no forms, no confusion.

To continue, please choose your language:',
          languageCode: 'en',
          components: []
        }
      });
    } else {
      await sendGupshupMessage(sender, 'Type "hi" to start checking eligible Sarkari Yojanas 🇮🇳');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ✅ Corrected function to send text or template messages via Gupshup
async function sendGupshupMessage(destination, message) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    apikey: process.env.GUPSHUP_APP_TOKEN
  };

  const isTemplate = message.type === "template";
  const params = {
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER,
    destination,
    'src.name': 'ApnaSchemeTechnologies'
  };

  if (isTemplate) {
    params.message = message.template.name;
    params.msgType = 'HSM';
    params.isHSM = 'true';
    params.language = message.template.languageCode;

    if (message.template.components?.length > 0) {
      const templateParams = message.template.components
        .flatMap(c => c.parameters || [])
        .map(p => p.text || '');
      params.params = templateParams;
    }
  } else {
    params.message = typeof message === 'string' ? message : JSON.stringify(message);
  }

  return axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams(params).toString(),
    { headers }
  );
}

app.listen(PORT, () => {
  console.log(`✅ ApnaScheme bot server started on port ${PORT}`);
});
