import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

const questions = [
  { id: 'q1', text: 'Aapka gender kya hai?\n👨‍🦰 Purush\n👩 Mahila\n🧕 Anya', key: 'gender' },
  { id: 'q2', text: 'Aapki age kitni hai? (Numeric mein likhein eg. 18)', key: 'age' },
  { id: 'q3', text: 'Aapka rajya kaunsa hai?', key: 'state' },
  { id: 'q4', text: 'Aap SC/ST/OBC/EWS category mein aate ho kya?\nHaan / Nahi', key: 'casteCategory' },
  { id: 'q5', text: 'Aapka current occupation kya hai?\nStudent / Unemployed / Employed / Self-employed / Farmer / Labourer', key: 'occupation' },
  { id: 'q6', text: 'Aapka ghar ka saalana aay kya hai?', key: 'income' },
  { id: 'q7', text: 'Aapka bank account khula hai kya?\nHaan / Nahi', key: 'bankAccount' },
  { id: 'q8', text: 'Kya aapke paas ration card hai?\nHaan / Nahi', key: 'rationCard' },
  { id: 'q9', text: 'Kya aap kisi existing Sarkari Yojana ka labh le rahe ho?\nHaan / Nahi', key: 'existingScheme' }
];

const userContext = new Map();

app.post('/gupshup', async (req, res) => {
  const body = req.body;
  const phone = body.payload?.sender?.phone;
  const message = body.payload?.payload?.text?.trim();

  if (!phone || !message) return res.sendStatus(200);

  const userRef = db.collection('users').doc(phone);
  let userData = (await userRef.get()).data() || {};
  let context = userContext.get(phone) || { currentQuestionIndex: 0 };

  if (message.toLowerCase() === 'hi') {
    context = { currentQuestionIndex: 0 };
    userContext.set(phone, context);
    await sendMessage(phone, questions[0].text);
    return res.sendStatus(200);
  }

  // Save response
  const prevQ = questions[context.currentQuestionIndex];
  if (prevQ) {
    userData[prevQ.key] = message;
    await userRef.set(userData, { merge: true });
  }

  // Skip logic
  context.currentQuestionIndex++;
  while (context.currentQuestionIndex < questions.length) {
    const nextQ = questions[context.currentQuestionIndex];

    if (nextQ.id === 'q6' && ['Student', 'Unemployed'].includes(userData.occupation)) {
      userData['guardianIncome'] = message;
      context.currentQuestionIndex++;
      continue;
    }

    if (nextQ.id === 'q7' && Number(userData.age) < 18) {
      context.currentQuestionIndex++;
      continue;
    }

    break;
  }

  if (context.currentQuestionIndex >= questions.length) {
    await sendMessage(phone, 'Shukriya! Aapke sabhi jawaab mil gaye hain. Ab main check kar raha hoon kaunsi Yojana aapke liye hai...');
    userContext.delete(phone);
  } else {
    await sendMessage(phone, questions[context.currentQuestionIndex].text);
    userContext.set(phone, context);
  }

  res.sendStatus(200);
});

async function sendMessage(phone, text) {
  await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE,
    destination: phone,
    message: { type: 'text', text },
    'src.name': process.env.GUPSHUP_BOTNAME
  }, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.GUPSHUP_API_KEY
    }
  });
}

app.listen(PORT, () => {
  console.log(`ApnaScheme bot server started on port ${PORT}`);
});
